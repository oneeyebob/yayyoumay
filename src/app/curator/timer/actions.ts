'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/admin'

export async function setTimer(
  profileId: string,
  expiresAt: string,
  autoCancelAt: string | null
): Promise<{ error: string | null }> {
  const admin = createAdminClient()

  // Read global pause_duration_minutes from app_settings
  const supabase = await createClient()
  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'pause_duration_minutes')
    .single()
  const pauseDurationMinutes = parseInt(setting?.value ?? '10', 10)

  const { error } = await admin
    .from('screen_timers')
    .upsert(
      {
        profile_id: profileId,
        expires_at: expiresAt,
        auto_cancel_at: autoCancelAt,
        pause_duration_minutes: pauseDurationMinutes,
        pause_until: null,
        is_active: true,
      },
      { onConflict: 'profile_id' }
    )

  return { error: error ? 'Kunne ikke starte timer.' : null }
}

export async function cancelTimer(
  profileId: string
): Promise<{ error: string | null }> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('screen_timers')
    .update({ is_active: false })
    .eq('profile_id', profileId)

  return { error: error ? 'Kunne ikke annullere timer.' : null }
}

export async function setPause(
  profileIds: string[],
  blockedUntil: string
): Promise<{ error: string | null }> {
  if (profileIds.length === 0) return { error: null }

  const admin = createAdminClient()

  const supabase = await createClient()
  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'pause_duration_minutes')
    .single()
  const pauseDurationMinutes = parseInt(setting?.value ?? '10', 10)

  // Fetch any active timers for these profiles so we can freeze them
  const { data: activeTimers } = await admin
    .from('screen_timers')
    .select('profile_id, expires_at, is_active')
    .in('profile_id', profileIds)
    .eq('is_active', true)

  const now = Date.now()
  const frozenAt = new Date(now).toISOString()

  const rows = profileIds.map((profileId) => {
    const activeTimer = activeTimers?.find((t) => t.profile_id === profileId)
    const frozenSecondsRemaining = activeTimer
      ? Math.max(0, Math.floor((new Date(activeTimer.expires_at).getTime() - now) / 1000))
      : null

    return {
      profile_id: profileId,
      expires_at: activeTimer?.expires_at ?? blockedUntil,
      blocked_until: blockedUntil,
      pause_duration_minutes: pauseDurationMinutes,
      is_active: false,
      frozen_at: activeTimer ? frozenAt : null,
      frozen_seconds_remaining: frozenSecondsRemaining,
    }
  })

  const { error } = await admin
    .from('screen_timers')
    .upsert(rows, { onConflict: 'profile_id' })

  return { error: error ? 'Kunne ikke sætte pause.' : null }
}

export async function cancelPause(
  profileIds: string[]
): Promise<{ error: string | null }> {
  if (profileIds.length === 0) return { error: null }

  const admin = createAdminClient()

  // Fetch rows to check for frozen timers that need thawing
  const { data: rows } = await admin
    .from('screen_timers')
    .select('profile_id, frozen_seconds_remaining')
    .in('profile_id', profileIds)

  const now = Date.now()

  // Build per-row updates: thaw frozen timers by computing a new expires_at
  const updates = await Promise.all(
    profileIds.map(async (profileId) => {
      const row = rows?.find((r) => r.profile_id === profileId)
      const newExpiresAt =
        row?.frozen_seconds_remaining != null
          ? new Date(now + row.frozen_seconds_remaining * 1000).toISOString()
          : null

      const patch: Record<string, unknown> = {
        blocked_until: null,
        frozen_at: null,
        frozen_seconds_remaining: null,
      }
      if (newExpiresAt) {
        patch.expires_at = newExpiresAt
        patch.is_active = true
      }

      return admin
        .from('screen_timers')
        .update(patch)
        .eq('profile_id', profileId)
    })
  )

  const firstError = updates.find((r) => r.error)?.error
  return { error: firstError ? 'Kunne ikke annullere pause.' : null }
}

export async function updatePauseVideoUrl(
  url: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind.' }
  if (!(await isSuperAdmin(user.id))) return { error: 'Ikke autoriseret.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('app_settings')
    .update({ value: url, updated_at: new Date().toISOString() })
    .eq('key', 'pause_video_url')

  return { error: error ? 'Kunne ikke gemme URL.' : null }
}

export async function updatePauseDurationMinutes(
  minutes: number
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind.' }
  if (!(await isSuperAdmin(user.id))) return { error: 'Ikke autoriseret.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('app_settings')
    .update({ value: String(minutes), updated_at: new Date().toISOString() })
    .eq('key', 'pause_duration_minutes')

  return { error: error ? 'Kunne ikke gemme pauselængde.' : null }
}
