'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
