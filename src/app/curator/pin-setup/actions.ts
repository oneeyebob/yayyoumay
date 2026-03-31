'use server'

import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'

export async function savePinHash(pin: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated.' }
  }

  const pinHash = await bcrypt.hash(pin, 10)

  const { error } = await supabase
    .from('user_settings')
    .update({ curator_pin_hash: pinHash })
    .eq('user_id', user.id)

  if (error) {
    return { error: 'Failed to save PIN. Please try again.' }
  }

  return { error: null }
}
