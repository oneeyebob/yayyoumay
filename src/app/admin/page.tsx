import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin, isSuperAdmin } from '@/lib/admin'
import AdminUI, { type AdminList, type AdminUser } from './AdminUI'

const YAYYOUMAY_USER_ID = 'c0e3d233-4c33-4bd9-98b3-4625a9b731a3'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !(await isAdmin(user.id))) redirect('/')

  const superAdmin = await isSuperAdmin(user.id)
  const admin = createAdminClient()

  // ── YayYouMay lister ────────────────────────────────────────────────────────
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', YAYYOUMAY_USER_ID)

  const profileIds = (profileRows ?? []).map((p) => p.id)

  const { data: listRows } = await admin
    .from('lists')
    .select('id, name, description, is_public')
    .in('profile_id', profileIds.length ? profileIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: true })

  const counts = await Promise.all(
    (listRows ?? []).map((l) =>
      admin
        .from('list_items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', l.id)
        .then(({ count }) => ({ id: l.id, count: count ?? 0 }))
    )
  )
  const countMap = new Map(counts.map((c) => [c.id, c.count]))

  const lists: AdminList[] = (listRows ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    is_public: l.is_public,
    item_count: countMap.get(l.id) ?? 0,
  }))

  // ── Admin brugere (kun super_admin) ─────────────────────────────────────────
  let adminUsers: AdminUser[] = []

  if (superAdmin) {
    type AdminUserRaw = { id: string; user_id: string; role: string; created_at: string }
    const { data: rawAdmins } = await (admin
      .from('admin_users' as never)
      .select('id, user_id, role, created_at')
      .order('created_at', { ascending: true }) as unknown as Promise<{ data: AdminUserRaw[] | null }>)

    if (rawAdmins?.length) {
      const userIds = rawAdmins.map((a) => a.user_id)
      const { data: settings } = await admin
        .from('user_settings')
        .select('user_id, username')
        .in('user_id', userIds)

      const usernameMap = new Map((settings ?? []).map((s) => [s.user_id, s.username]))

      adminUsers = rawAdmins.map((a) => ({
        id: a.id,
        user_id: a.user_id,
        username: usernameMap.get(a.user_id) ?? null,
        role: a.role,
        created_at: a.created_at,
      }))
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-2">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Admin</h1>
          <p className="text-sm text-gray-500 mt-0.5">YayYouMay administration</p>
        </div>
        <AdminUI
          lists={lists}
          adminUsers={adminUsers}
          isSuperAdmin={superAdmin}
          currentUserId={user.id}
        />
      </div>
    </main>
  )
}
