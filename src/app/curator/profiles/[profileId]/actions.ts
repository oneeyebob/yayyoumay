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
    // 23505 = unique_violation
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

export async function updateListSettings(params: {
  listId: string
  langFilter: string   // comma-separated, e.g. "dansk,engelsk"
  ageFilter: string    // comma-separated, e.g. "4-6,7-9"
  profileId: string
}): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lists')
    .update({
      lang_filter: params.langFilter || null,
      age_filter: params.ageFilter || null,
    })
    .eq('id', params.listId)

  if (error) return { error: 'Kunne ikke gemme indstillinger.' }

  revalidatePath(`/curator/profiles/${params.profileId}`)
  return { error: null }
}

export async function removeListItem(
  listItemId: string,
  profileId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('id', listItemId)

  if (error) return { error: 'Kunne ikke fjerne elementet.' }

  revalidatePath(`/curator/profiles/${profileId}`)
  return { error: null }
}
