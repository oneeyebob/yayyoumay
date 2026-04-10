import { createAdminClient } from '@/lib/supabase/admin'

type AdminUserRow = { id: string; user_id: string; role: string }

export async function isAdmin(userId: string): Promise<boolean> {
  const client = createAdminClient()
  const { data } = await (client
    .from('admin_users' as never)
    .select('id')
    .eq('user_id' as never, userId)
    .limit(1)
    .single() as unknown as Promise<{ data: AdminUserRow | null }>)
  return !!data
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const client = createAdminClient()
  const { data } = await (client
    .from('admin_users' as never)
    .select('role')
    .eq('user_id' as never, userId)
    .eq('role' as never, 'super_admin')
    .limit(1)
    .single() as unknown as Promise<{ data: Pick<AdminUserRow, 'role'> | null }>)
  return !!data
}
