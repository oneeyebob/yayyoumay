import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    const first = profiles?.[0]
    if (first) {
      const cookieStore = await cookies()
      cookieStore.set('active_profile_id', first.id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
    }
  }

  redirect('/curator')
}
