'use server'

import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function verifyHotkeyForPinReset(
  hotkey: string
): Promise<{ error: string }> {
  const normalised = hotkey.replace(/\s+/g, '').toUpperCase()

  if (normalised.length !== 32) {
    return { error: 'Nøglen skal være præcis 32 tegn.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind.' }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('hotkey_hash')
    .eq('user_id', user.id)
    .single()

  if (!settings?.hotkey_hash) {
    return { error: 'Ingen gendannelsesnøgle fundet for denne konto.' }
  }

  const match = await bcrypt.compare(normalised, settings.hotkey_hash)
  if (!match) {
    return { error: 'Forkert gendannelsesnøgle.' }
  }

  // Set a short-lived one-time flag that allows pin-setup without knowing the old PIN
  const cookieStore = await cookies()
  cookieStore.set('pin_reset', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60, // 10 minutes
  })

  redirect('/curator/pin-setup')
}
