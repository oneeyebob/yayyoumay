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

export async function createAndAddTag(
  listId: string,
  category: string,
  labelDa: string,
): Promise<{ error: string | null; tag?: { id: string; slug: string; label_da: string } }> {
  await assertAdmin()
  const admin = createAdminClient()

  const slug = labelDa
    .toLowerCase()
    .trim()
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Insert into tags (is_seed = false for manually created tags)
  const { data: tag, error: tagError } = await admin
    .from('tags')
    .insert({ slug, category, label_da: labelDa.trim(), label_en: labelDa.trim(), is_seed: false })
    .select('id, slug, label_da')
    .single()

  if (tagError || !tag) return { error: tagError?.message ?? 'Kunne ikke oprette tag.' }

  // Link to list
  const { error: linkError } = await (admin
    .from('list_tags' as never)
    .insert({ list_id: listId, tag_id: tag.id } as never) as unknown as Promise<{ error: { message: string } | null }>)

  if (linkError) return { error: linkError.message }

  revalidatePath(`/admin/lists/${listId}`)
  return { error: null, tag: { id: tag.id, slug: tag.slug, label_da: tag.label_da ?? labelDa } }
}

export async function deleteTag(tagId: string): Promise<{ error: string | null }> {
  await assertAdmin()
  const admin = createAdminClient()
  // CASCADE on list_tags will remove related rows automatically
  const { error } = await admin.from('tags').delete().eq('id', tagId)
  if (error) return { error: error.message }
  return { error: null }
}

