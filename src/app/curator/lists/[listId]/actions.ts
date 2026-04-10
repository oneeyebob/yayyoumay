'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function toggleListPublic(
  listId: string,
  isPublic: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind.' }

  // Ownership check via profile
  const { data: list } = await supabase
    .from('lists')
    .select('profile_id')
    .eq('id', listId)
    .single()

  if (!list) return { error: 'Liste ikke fundet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', list.profile_id)
    .eq('user_id', user.id)
    .single()

  if (!profile) return { error: 'Ingen adgang.' }

  const { error } = await supabase
    .from('lists')
    .update({ is_public: isPublic })
    .eq('id', listId)

  if (error) return { error: error.message }

  revalidatePath(`/curator/lists/${listId}`)
  return { error: null }
}

export async function removeListItem(
  listItemId: string,
  listId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('id', listItemId)

  if (error) return { error: 'Kunne ikke fjerne elementet.' }

  revalidatePath(`/curator/lists/${listId}`)
  return { error: null }
}
