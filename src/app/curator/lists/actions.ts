'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createList(params: {
  name: string
  profileId: string
  langFilter: string   // comma-separated language slugs, e.g. "dansk,engelsk"
  description: string
}): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Ikke logget ind.' }

  // Verify the profile belongs to the current user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', params.profileId)
    .eq('user_id', userId)
    .single()

  if (!profile) return { error: 'Profil ikke fundet.' }

  const { error } = await supabase.from('lists').insert({
    name: params.name.trim(),
    profile_id: params.profileId,
    lang_filter: params.langFilter || null,
    description: params.description.trim() || null,
  })

  if (error) return { error: 'Kunne ikke oprette liste.' }

  revalidatePath('/curator/lists')
  return { error: null }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateList(params: {
  id: string
  name: string
  langFilter: string
  description: string
}): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // RLS enforces ownership; the update silently no-ops if not owner
  const { error } = await supabase
    .from('lists')
    .update({
      name: params.name.trim(),
      lang_filter: params.langFilter || null,
      description: params.description.trim() || null,
    })
    .eq('id', params.id)

  if (error) return { error: 'Kunne ikke opdatere liste.' }

  revalidatePath('/curator/lists')
  return { error: null }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteList(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', id)

  if (error) return { error: 'Kunne ikke slette liste.' }

  revalidatePath('/curator/lists')
  return { error: null }
}
