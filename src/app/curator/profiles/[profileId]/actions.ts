'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateListSettings(params: {
  listId: string
  langFilter: string
  ageFilter: string
  profileId: string
  description?: string
  isPublic?: boolean
  listName?: string
}): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lists')
    .update({
      ...(params.langFilter !== '' ? { lang_filter: params.langFilter || null } : {}),
      ...(params.ageFilter !== '' ? { age_filter: params.ageFilter || null } : {}),
      ...(params.description !== undefined ? { description: params.description || null } : {}),
      ...(params.isPublic !== undefined ? { is_public: params.isPublic } : {}),
      ...(params.listName !== undefined ? { name: params.listName } : {}),
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
