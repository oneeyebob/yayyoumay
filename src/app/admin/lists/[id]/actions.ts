'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isAdmin(user.id))) throw new Error('Ikke autoriseret.')
  return user
}

export async function updateListMeta(
  listId: string,
  name: string,
  description: string | null,
): Promise<{ error: string | null }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin
    .from('lists')
    .update({ name: name.trim(), description: description?.trim() ?? null })
    .eq('id', listId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/lists/${listId}`)
  revalidatePath('/admin')
  return { error: null }
}

export async function toggleListPublic(
  listId: string,
  isPublic: boolean,
): Promise<{ error: string | null }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin
    .from('lists')
    .update({ is_public: isPublic })
    .eq('id', listId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/lists/${listId}`)
  revalidatePath('/admin')
  return { error: null }
}

export async function removeItem(itemId: string, listId: string): Promise<{ error: string | null }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('list_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/lists/${listId}`)
  return { error: null }
}

type ListTagRow = { id: string; list_id: string; tag_id: string }

export async function addListTag(listId: string, tagId: string): Promise<{ error: string | null }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await (admin
    .from('list_tags' as never)
    .insert({ list_id: listId, tag_id: tagId } as never) as unknown as Promise<{ error: { message: string } | null }>)
  if (error) return { error: error.message }
  revalidatePath(`/admin/lists/${listId}`)
  return { error: null }
}

export async function removeListTag(listId: string, tagId: string): Promise<{ error: string | null }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await (admin
    .from('list_tags' as never)
    .delete()
    .eq('list_id' as never, listId)
    .eq('tag_id' as never, tagId) as unknown as Promise<{ error: { message: string } | null }>)
  if (error) return { error: error.message }
  revalidatePath(`/admin/lists/${listId}`)
  return { error: null }
}

export type { ListTagRow }
