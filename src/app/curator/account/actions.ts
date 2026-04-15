'use server'

import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'

export async function changePassword(params: {
  currentPassword: string
  newPassword: string
}): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { error: 'Ikke logget ind.' }

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: params.currentPassword,
  })
  if (signInError) return { error: 'Forkert nuværende adgangskode.' }

  const { error: updateError } = await supabase.auth.updateUser({
    password: params.newPassword,
  })
  if (updateError) return { error: 'Kunne ikke opdatere adgangskode. Prøv igen.' }

  return { error: null }
}

export async function changePin(newPin: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind.' }

  const pinHash = await bcrypt.hash(newPin, 10)
  const { error } = await supabase
    .from('user_settings')
    .update({ curator_pin_hash: pinHash })
    .eq('user_id', user.id)

  if (error) return { error: 'Kunne ikke gemme ny PIN.' }
  return { error: null }
}
