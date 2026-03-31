'use server'

import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function verifyPin(pin: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated.' }
  }

  const { data: settings, error: fetchError } = await supabase
    .from('user_settings')
    .select('curator_pin_hash')
    .eq('user_id', user.id)
    .single()

  if (fetchError || !settings?.curator_pin_hash) {
    return { error: 'PIN not configured.' }
  }

  const match = await bcrypt.compare(pin, settings.curator_pin_hash)

  if (!match) {
    return { error: 'Forkert PIN' }
  }

  const cookieStore = await cookies()
  cookieStore.set('curator_unlocked', 'true', {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 3600,
    path: '/',
  })

  return { error: null }
}
