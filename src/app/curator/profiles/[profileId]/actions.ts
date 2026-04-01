'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
