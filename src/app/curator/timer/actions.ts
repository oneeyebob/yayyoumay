'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/admin'

export async function setTimer(
  profileId: string,
  expiresAt: string,
  autoCancelAt: string | null,
  pauseDurationMinutes: number
): Promise<{ error: string | null }> {
  const admin = createAdminClient()

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

export async function getPauseVideoUrl(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'pause_video_url')
    .single()
  return data?.value ?? null
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
