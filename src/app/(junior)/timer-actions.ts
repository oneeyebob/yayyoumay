'use server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Called after successful PIN verification in TimerGuard.
 * Cancels both the active timer and any active pause for the profile,
 * giving the child unrestricted access until the curator sets a new timer.
 */
export async function unlockTimer(profileId: string): Promise<{ error: string | null }> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('screen_timers')
    .update({
      is_active: false,
      blocked_until: null,
      frozen_at: null,
      frozen_seconds_remaining: null,
    })
    .eq('profile_id', profileId)

  return { error: error ? 'Kunne ikke låse op.' : null }
}
