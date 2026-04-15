'use server'

import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Accounts have no real email — the Supabase auth email is a deterministic fake
// derived from the chosen username. This keeps PII off the platform entirely.
// The hotkey is the sole recovery mechanism; its hash (never the raw value) is
// stored here so the /recover flow can verify it later.

export async function registerUser(params: {
  username: string
  password: string
  hotkey: string   // raw key generated client-side; hashed here before storage
}): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // Pre-check: reject immediately if username is already in user_settings
  const admin = createAdminClient()
  const { data: existingUser } = await admin
    .from('user_settings')
    .select('user_id')
    .eq('username', params.username.trim())
    .maybeSingle()

  if (existingUser) {
    return { error: 'Brugernavnet er allerede taget — vælg et andet.' }
  }

  const fakeEmail = `${params.username.trim().toLowerCase()}@yayyoumay.local`
  const hotkeyHash = await bcrypt.hash(params.hotkey, 10)

  // signUp — if this username's derived email is already registered, Supabase
  // will return an error, which we surface as "username taken".
  const { data, error: signUpError } = await supabase.auth.signUp({
    email: fakeEmail,
    password: params.password,
  })

  if (signUpError || !data.user) {
    const msg = signUpError?.message ?? ''
    if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already in use')) {
      return { error: 'Dette brugernavn er allerede taget. Vælg et andet.' }
    }
    return { error: 'Kunne ikke oprette konto. Prøv igen.' }
  }

  // Insert user_settings — username + hotkey_hash + empty PIN slot
  const { error: settingsError } = await supabase.from('user_settings').insert({
    user_id: data.user.id,
    username: params.username.trim(),
    hotkey_hash: hotkeyHash,
    curator_pin_hash: null,
  })

  if (settingsError) {
    return { error: 'Konto oprettet, men indstillinger kunne ikke gemmes. Kontakt support.' }
  }

  // Clear any stale junior profile selection from a previous session
  const cookieStore = await cookies()
  cookieStore.delete('active_profile_id')

  return { error: null }
}
