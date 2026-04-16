import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { lockCurator } from './actions'
import { Lock, LockOpen, Timer } from 'lucide-react'
import CuratorNav from './CuratorNav'

export default async function CuratorLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const unlocked = cookieStore.get('curator_unlocked')?.value === 'true'

  // When locked, render children directly — page.tsx handles the gate UI
  if (!unlocked) {
    return <>{children}</>
  }

  const activeProfileId = cookieStore.get('active_profile_id')?.value ?? null
  let profileInitial: string | null = null

  if (activeProfileId) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', activeProfileId)
        .eq('user_id', user.id)
        .single()
      profileInitial = profile?.name?.charAt(0).toUpperCase() ?? null
    }
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between shrink-0 sticky top-0 z-10"
        style={{ height: 64, backgroundColor: '#1a1a1a', paddingLeft: 24, paddingRight: 24 }}
      >
        <Link href="/" aria-label="Gå til feed">
          <img
            src="/yay-logo-compact.svg"
            alt="YAY!"
            className="h-8 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </Link>

        <div className="flex items-center" style={{ gap: 8 }}>
          <Link
            href="/curator/timer"
            aria-label="Timer"
            className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/10 transition-colors"
          >
            <Timer size={18} color="white" />
          </Link>
          <form action={lockCurator} style={{ display: 'inline' }}>
            <button
              type="submit"
              aria-label="Lås"
              className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/10 transition-colors"
            >
              <LockOpen size={18} color="white" />
            </button>
          </form>
          {profileInitial && (
            <Link href="/curator/profiles">
              <div
                className="flex items-center justify-center font-semibold"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#3C3489',
                  color: '#CECBF6',
                  fontSize: 14,
                }}
              >
                {profileInitial}
              </div>
            </Link>
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1">
        <CuratorNav profileInitial={profileInitial} />
        <main className="flex-1" style={{ backgroundColor: '#f5f5f5' }}>
          {children}
        </main>
      </div>

    </div>
  )
}
