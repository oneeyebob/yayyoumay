'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Keyword blacklist ─────────────────────────────────────────────────────────

export async function addKeyword(
  keyword: string
): Promise<{ error: string | null; id?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind.' }

  const trimmed = keyword.trim().toLowerCase()
  if (!trimmed) return { error: 'Skriv et ord først.' }

  const { data, error } = await supabase
    .from('keyword_blacklist')
    .insert({ user_id: user.id, keyword: trimmed })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: `'${trimmed}' er allerede på listen.` }
    return { error: 'Kunne ikke tilføje ord.' }
  }

  return { error: null, id: data.id }
}

export async function removeKeyword(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('keyword_blacklist')
    .delete()
    .eq('id', id)

  return { error: error ? 'Kunne ikke fjerne ord.' : null }
}

// ── Change password ───────────────────────────────────────────────────────────

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

// ── Change PIN ────────────────────────────────────────────────────────────────

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

// ── YouTube Premium ───────────────────────────────────────────────────────────

export async function setYoutubePremium(
  enabled: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind.' }

  const { error } = await supabase
    .from('user_settings')
    .update({ youtube_premium: enabled })
    .eq('user_id', user.id)

  if (error) return { error: 'Kunne ikke gemme indstillingen.' }

  revalidatePath('/curator/settings')
  return { error: null }
}
