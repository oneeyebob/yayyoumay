'use server'

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
