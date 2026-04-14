import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profileId')
  if (!profileId) {
    return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
  }

  const admin = createAdminClient()

  const [{ data: timer }, { data: settings }] = await Promise.all([
    admin
      .from('screen_timers')
      .select('expires_at, is_active, blocked_until')
      .eq('profile_id', profileId)
      .single(),
    admin
      .from('app_settings')
      .select('key, value')
      .eq('key', 'pause_video_url'),
  ])

  const now = new Date()
  const pauseVideoUrl = settings?.find((s) => s.key === 'pause_video_url')?.value ?? ''

  const isActive = timer?.is_active === true
  const expiresAt = timer?.expires_at ? new Date(timer.expires_at) : null
  const blockedUntil = timer?.blocked_until ? new Date(timer.blocked_until) : null

  const timerExpired = isActive && expiresAt !== null && expiresAt < now
  const isPaused = blockedUntil !== null && blockedUntil > now
  const secondsRemaining =
    isActive && expiresAt && expiresAt > now
      ? Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
      : 0

  return NextResponse.json({
    timerExpired,
    isPaused,
    secondsRemaining,
    pauseUntil: isPaused ? timer!.blocked_until : null,
    pauseVideoUrl,
  })
}
