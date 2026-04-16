import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import LibraryUI, { type PublicList } from './LibraryUI'

const ADMIN_USER_ID = 'c0e3d233-4c33-4bd9-98b3-4625a9b731a3'
const PAGE_SIZE = 10

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { page: pageStr, q: rawQ } = await searchParams
  const q = rawQ?.trim() ?? ''
  const communityPage = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const offset = (communityPage - 1) * PAGE_SIZE

  const cookieStore = await cookies()

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
  const adminProfileIdArray = [...adminProfileIds]

  type ListRow = { id: string; name: string; description: string | null; profile_id: string }

  // Fetch all recommended lists (admin-curated, typically few — no pagination needed)
  let recommendedRaw: ListRow[] = []
  if (adminProfileIdArray.length > 0) {
    let recQuery = supabase
      .from('lists')
      .select('id, name, description, profile_id')
      .eq('is_public', true)
      .in('profile_id', adminProfileIdArray)
      .order('created_at', { ascending: true })

    if (q) {
      recQuery = recQuery.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    }

    const { data } = await recQuery
    recommendedRaw = data ?? []
  }

  // Fetch paginated community lists with total count
  let communityQuery = supabase
    .from('lists')
    .select('id, name, description, profile_id', { count: 'exact' })
    .eq('is_public', true)
    .order('created_at', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  if (adminProfileIdArray.length > 0) {
    communityQuery = communityQuery.not('profile_id', 'in', `(${adminProfileIdArray.join(',')})`)
  }

  if (q) {
    communityQuery = communityQuery.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
  }

  const { data: communityRawData, count: communityTotal } = await communityQuery
  const communityRaw: ListRow[] = communityRawData ?? []
  const communityTotalPages = Math.max(1, Math.ceil((communityTotal ?? 0) / PAGE_SIZE))

  const allRows = [...recommendedRaw, ...communityRaw]
  const allListIds = allRows.map((l) => l.id)

  // Count items per list + fetch channel thumbnails in parallel
  const [counts, channelItemsResult] = await Promise.all([
    Promise.all(
      allRows.map((l) =>
        supabase
          .from('list_items')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', l.id)
          .then(({ count }) => ({ id: l.id, count: count ?? 0 }))
      )
    ),
    allListIds.length > 0
      ? adminSupabase
          .from('list_items')
          .select('list_id, channels(thumbnail_url)')
          .in('list_id', allListIds)
          .not('channel_id', 'is', null)
      : Promise.resolve({ data: [] }),
  ])

  const countMap = new Map(counts.map((c) => [c.id, c.count]))

  // Group up to 9 thumbnails per list
  const thumbnailMap = new Map<string, string[]>()
  for (const item of (channelItemsResult.data ?? []) as { list_id: string; channels: { thumbnail_url: string | null } | null }[]) {
    const url = item.channels?.thumbnail_url
    if (!url) continue
    const existing = thumbnailMap.get(item.list_id) ?? []
    if (existing.length < 9) {
      existing.push(url)
      thumbnailMap.set(item.list_id, existing)
    }
  }

  function toList(rows: ListRow[]): PublicList[] {
    return rows.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      item_count: countMap.get(l.id) ?? 0,
      channelThumbnails: thumbnailMap.get(l.id) ?? [],
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

  void profileName // fetched for potential future use

  return (
    <LibraryUI
      recommendedLists={recommendedLists}
      communityLists={communityLists}
      subscribedIds={subscribedIds}
      communityPage={communityPage}
      communityTotalPages={communityTotalPages}
      currentQ={q}
    />
  )
}
