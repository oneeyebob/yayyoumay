'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'

const YAYYOUMAY_USER_ID = 'c0e3d233-4c33-4bd9-98b3-4625a9b731a3'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isAdmin(user.id))) throw new Error('Ikke autoriseret.')
  return user
}

// ── Lister ────────────────────────────────────────────────────────────────────

export async function createAdminList(
  name: string
): Promise<{ error: string | null; id?: string }> {
  await assertAdmin()
  const admin = createAdminClient()

  // Get or create a profile for YayYouMay if needed
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', YAYYOUMAY_USER_ID)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!profile) return { error: 'YayYouMay profil ikke fundet.' }

  const { data, error } = await admin
    .from('lists')
    .insert({ profile_id: profile.id, name: name.trim(), is_public: false })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null, id: data.id }
}

export async function deleteAdminList(listId: string): Promise<{ error: string | null }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('lists').delete().eq('id', listId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}

export async function toggleAdminListPublic(
  listId: string,
  isPublic: boolean
): Promise<{ error: string | null }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('lists').update({ is_public: isPublic }).eq('id', listId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}

// ── Admin users ───────────────────────────────────────────────────────────────

export async function removeAdminUser(targetUserId: string): Promise<{ error: string | null }> {
  const user = await assertAdmin()
  if (user.id === targetUserId) return { error: 'Du kan ikke fjerne dig selv.' }
  const admin = createAdminClient()
  const { error } = await (admin
    .from('admin_users' as never)
    .delete()
    .eq('user_id' as never, targetUserId) as unknown as Promise<{ error: { message: string } | null }>)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}

export async function addAdminUser(
  username: string,
  role: 'admin' | 'super_admin'
): Promise<{ error: string | null }> {
  await assertAdmin()
  const admin = createAdminClient()

  // Look up user_id via username in user_settings
  const { data: settings } = await admin
    .from('user_settings')
    .select('user_id')
    .eq('username', username.trim())
    .single()

  if (!settings) return { error: `Bruger "${username}" ikke fundet.` }

  const { error } = await (admin
    .from('admin_users' as never)
    .insert({ user_id: settings.user_id, role } as never) as unknown as Promise<{ error: { message: string } | null }>)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}
