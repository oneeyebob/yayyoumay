import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must be called before any redirect logic
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // / — redirect to /login if no session; authenticated users stay on /
  if (pathname === '/') {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // /curator/* — requires an active session
  // PIN gate is handled at the page level via the curator_unlocked cookie
  if (pathname.startsWith('/curator')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Onboarding guard — if the user is authenticated but has no profiles yet,
  // send them to /curator/profiles to create their first household profile.
  // Profiles represent people in the household (children, etc.), not the account holder.
  // Skip this check on pages that are part of the setup flow itself.
  const isSetupRoute =
    pathname.startsWith('/curator/profiles') ||
    pathname.startsWith('/curator/pin-setup') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register')

  if (session && !isSetupRoute) {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)

    if (count === 0) {
      return NextResponse.redirect(new URL('/curator/profiles', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
