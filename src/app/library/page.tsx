import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SharedHeader from '@/components/shared/SharedHeader'
import LibraryUI, { type PublicList } from './LibraryUI'

const ADMIN_USER_ID = 'c0e3d233-4c33-4bd9-98b3-4625a9b731a3'

export default async function LibraryPage() {
  const cookieStore = await cookies()
  const unlocked = cookieStore.get('curator_unlocked')?.value === 'true'
  if (!unlocked) redirect('/curator')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const activeProfileId = cookieStore.get('active_profile_id')?.value ?? null
  let profileName: string | null = null
  if (user && activeProfileId) {
    const { data: activeProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', activeProfileId)
      .eq('user_id', user.id)
      .single()
    profileName = activeProfile?.name ?? null
  }

  // Identify admin profile IDs — use admin client to bypass RLS
  const adminSupabase = createAdminClient()
  const { data: adminProfiles } = await adminSupabase
    .from('profiles')
    .select('id')
    .eq('user_id', ADMIN_USER_ID)

  const adminProfileIds = new Set(adminProfiles?.map((p) => p.id) ?? [])

  // Fetch all public lists
  const { data: allListsRaw } = await supabase
    .from('lists')
    .select('id, name, description, profile_id')
    .eq('is_public', true)
    .order('created_at', { ascending: true })

  const allRows = allListsRaw ?? []

  const recommendedRaw = allRows.filter((l) => adminProfileIds.has(l.profile_id))
  const communityRaw = allRows.filter((l) => !adminProfileIds.has(l.profile_id))

  // Count items per list
  const counts = await Promise.all(
    allRows.map((l) =>
      supabase
        .from('list_items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', l.id)
        .then(({ count }) => ({ id: l.id, count: count ?? 0 }))
    )
  )
  const countMap = new Map(counts.map((c) => [c.id, c.count]))

  function toList(rows: typeof allRows): PublicList[] {
    return rows.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      item_count: countMap.get(l.id) ?? 0,
    }))
  }

  const recommendedLists = toList(recommendedRaw)
  const communityLists = toList(communityRaw)

// Fetch current user's subscriptions
  let subscribedIds: string[] = []
  if (user) {
    const { data: subs } = await supabase
      .from('list_subscriptions' as never)
      .select('list_id')
      .eq('subscriber_user_id', user.id) as { data: { list_id: string }[] | null }
    subscribedIds = (subs ?? []).map((s) => s.list_id)
  }

  return (
    <>
      <SharedHeader
        showAvatar={!!profileName}
        profileInitial={profileName?.charAt(0).toUpperCase()}
        avatarHref="/curator/profiles"
        showLockButton={true}
      />
      <LibraryUI
        recommendedLists={recommendedLists}
        communityLists={communityLists}
        subscribedIds={subscribedIds}
      />
    </>
  )
}
