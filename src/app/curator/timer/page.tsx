import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/admin'
import SharedHeader from '@/components/shared/SharedHeader'
import TimerUI, { type ProfileRow, type TimerRow } from './TimerUI'

export default async function TimerPage() {
  const cookieStore = await cookies()
  const unlocked = cookieStore.get('curator_unlocked')?.value === 'true'
  if (!unlocked) redirect('/curator')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load profiles
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const profiles: ProfileRow[] = (profilesData ?? []).map((p) => ({
    id: p.id,
    name: p.name,
  }))

  // Load active timers for these profiles
  const profileIds = profiles.map((p) => p.id)
  let timers: TimerRow[] = []

  if (profileIds.length > 0) {
    const admin = createAdminClient()
    const { data: timerData } = await admin
      .from('screen_timers')
      .select('id, profile_id, expires_at, auto_cancel_at, pause_duration_minutes, is_active')
      .in('profile_id', profileIds)
      .eq('is_active', true)

    timers = (timerData ?? []).map((t) => ({
      id: t.id,
      profileId: t.profile_id,
      expiresAt: t.expires_at,
      autoCancelAt: t.auto_cancel_at,
      pauseDurationMinutes: t.pause_duration_minutes,
      isActive: t.is_active,
    }))
  }

  // Load app settings
  const { data: settingsData } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['pause_video_url', 'pause_duration_minutes'])

  const settingsMap = Object.fromEntries((settingsData ?? []).map((s) => [s.key, s.value]))
  const pauseVideoUrl = settingsMap['pause_video_url'] ?? ''
  const pauseDurationMinutes = parseInt(settingsMap['pause_duration_minutes'] ?? '10', 10)

  const superAdmin = await isSuperAdmin(user.id)

  return (
    <main className="min-h-screen bg-gray-50">
      <SharedHeader style={{ zIndex: 100 }} />
      <div className="max-w-lg mx-auto px-4 py-8">
        <TimerUI
          profiles={profiles}
          activeTimers={timers}
          pauseVideoUrl={pauseVideoUrl}
          pauseDurationMinutes={pauseDurationMinutes}
          isSuperAdmin={superAdmin}
        />
      </div>
    </main>
  )
}
