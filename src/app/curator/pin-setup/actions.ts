'use server'

import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function savePinHash(pin: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Ikke logget ind.' }
  }

  const pinHash = await bcrypt.hash(pin, 10)

  const { error } = await supabase
    .from('user_settings')
    .update({ curator_pin_hash: pinHash })
    .eq('user_id', user.id)

  if (error) {
    return { error: 'Kunne ikke gemme PIN. Prøv igen.' }
  }

  // Clear the one-time reset flag if it was set
  const cookieStore = await cookies()
  cookieStore.delete('pin_reset')

  return { error: null }
}
