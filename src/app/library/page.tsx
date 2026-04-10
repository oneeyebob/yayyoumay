import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SharedHeader from '@/components/shared/SharedHeader'
import LibraryUI, { type PublicList } from './LibraryUI'

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

  // Fetch all public lists
  const { data: listsRaw } = await supabase
    .from('lists')
    .select('id, name, description')
    .eq('is_public', true)
    .order('created_at', { ascending: true })

  // Count items per list
  const listRows = listsRaw ?? []
  const counts = await Promise.all(
    listRows.map((l) =>
      supabase
        .from('list_items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', l.id)
        .then(({ count }) => ({ id: l.id, count: count ?? 0 }))
    )
  )
  const countMap = new Map(counts.map((c) => [c.id, c.count]))

  const lists: PublicList[] = listRows.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    item_count: countMap.get(l.id) ?? 0,
  }))

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
      <LibraryUI lists={lists} subscribedIds={subscribedIds} />
    </>
  )
}
