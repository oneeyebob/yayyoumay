import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SharedHeader from '@/components/shared/SharedHeader'
import ProfileDetailUI, { type ProfileData, type ListData, type ItemRow } from './ProfileDetailUI'

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>
}) {
  const { profileId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Load profile — verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, avatar_color')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .single()

  if (!profile) notFound()

  // Load this profile's list (1:1). Create one if it doesn't exist yet
  // so the page is always usable, even for profiles created before the
  // auto-list logic was added.
  let { data: listRow } = await supabase
    .from('lists')
    .select('id, name, description, is_public')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!listRow) {
    const { data: created } = await supabase
      .from('lists')
      .insert({ profile_id: profileId, name: profile.name })
      .select('id, name, description, is_public')
      .single()
    listRow = created
  }

  // Load yay'd items for this list
  let items: ItemRow[] = []

  if (listRow) {
    const { data: rawItems } = await supabase
      .from('list_items')
      .select(`
        id,
        channels(id, name, thumbnail_url, yt_channel_id),
        videos(id, title, thumbnail_url, yt_video_id)
      `)
      .eq('list_id', listRow.id)
      .eq('status', 'yay')
      .order('created_at', { ascending: false })

    items = (rawItems ?? []).map((item) => {
      const ch = Array.isArray(item.channels) ? item.channels[0] : item.channels
      const vid = Array.isArray(item.videos) ? item.videos[0] : item.videos
      if (ch) {
        return {
          id: item.id,
          type: 'channel' as const,
          title: ch.name,
          thumbnail: ch.thumbnail_url,
          ytId: ch.yt_channel_id,
        }
      }
      return {
        id: item.id,
        type: 'video' as const,
        title: vid?.title ?? '—',
        thumbnail: vid?.thumbnail_url ?? null,
        ytId: vid?.yt_video_id ?? '',
      }
    })
  }

  const profileData: ProfileData = {
    id: profile.id,
    name: profile.name,
    avatar_color: profile.avatar_color,
  }

  const listData: ListData | null = listRow
    ? { id: listRow.id, name: listRow.name, description: listRow.description, is_public: listRow.is_public }
    : null

  return (
    <main className="min-h-screen bg-gray-50">
      <SharedHeader
        showAvatar={true}
        profileInitial={profile.name.charAt(0).toUpperCase()}
        avatarHref="/curator/profiles"
        showLockButton={true}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/curator/profiles"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Profiler
        </Link>

        <ProfileDetailUI profile={profileData} list={listData} items={items} />
      </div>
    </main>
  )
}
