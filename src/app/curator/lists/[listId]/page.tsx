import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ListDetailUI, { type ListDetail, type ListItemRow } from './ListDetailUI'

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Load list
  const { data: list } = await supabase
    .from('lists')
    .select('id, name, description, lang_filter, profile_id')
    .eq('id', listId)
    .single()

  if (!list) notFound()

  // Verify the list belongs to the current user via its profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', list.profile_id)
    .eq('user_id', user.id)
    .single()

  if (!profile) notFound()

  // Load list items with joined channel / video data
  const { data: rawItems } = await supabase
    .from('list_items')
    .select(`
      id, status,
      channels(id, name, thumbnail_url, yt_channel_id),
      videos(id, title, thumbnail_url, yt_video_id)
    `)
    .eq('list_id', listId)
    .order('created_at', { ascending: false })

  const items: ListItemRow[] = (rawItems ?? []).map((item) => {
    // Normalise in case Supabase returns an array for to-one relations
    const ch = Array.isArray(item.channels) ? item.channels[0] : item.channels
    const vid = Array.isArray(item.videos) ? item.videos[0] : item.videos

    if (ch) {
      return {
        id: item.id,
        status: item.status as 'yay' | 'nay',
        type: 'channel' as const,
        title: ch.name,
        thumbnail: ch.thumbnail_url,
        ytId: ch.yt_channel_id,
      }
    }

    return {
      id: item.id,
      status: item.status as 'yay' | 'nay',
      type: 'video' as const,
      title: vid?.title ?? '—',
      thumbnail: vid?.thumbnail_url ?? null,
      ytId: vid?.yt_video_id ?? '',
    }
  })

  const detail: ListDetail = {
    id: list.id,
    name: list.name,
    description: list.description,
    lang_filter: list.lang_filter,
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/curator/lists"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Lister
        </Link>

        <ListDetailUI list={detail} items={items} />
      </div>
    </main>
  )
}
