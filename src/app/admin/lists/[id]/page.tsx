import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'
import ListEditUI, { type ListDetail, type ItemRow, type TagRow } from './ListEditUI'

export default async function AdminListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isAdmin(user.id))) redirect('/')

  const admin = createAdminClient()

  const { data: listRow } = await admin
    .from('lists')
    .select('id, name, description, is_public')
    .eq('id', id)
    .single()

  if (!listRow) notFound()

  const list: ListDetail = {
    id: listRow.id,
    name: listRow.name,
    description: listRow.description,
    is_public: listRow.is_public,
  }

  // Fetch all tags + active tags for this list (parallel)
  type RawTag = { id: string; slug: string; category: string | null; label_da: string | null }
  type RawListTag = { tag_id: string }

  const [{ data: rawTags }, { data: rawListTags }] = await Promise.all([
    admin.from('tags').select('id, slug, category, label_da').order('category') as unknown as Promise<{ data: RawTag[] | null }>,
    (admin
      .from('list_tags' as never)
      .select('tag_id')
      .eq('list_id' as never, id) as unknown as Promise<{ data: RawListTag[] | null }>),
  ])

  const allTags: TagRow[] = (rawTags ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    category: t.category,
    label_da: t.label_da,
  }))
  const activeTagIds = (rawListTags ?? []).map((lt) => lt.tag_id)

  // Fetch items with joined channel/video data
  const { data: rawItems } = await admin
    .from('list_items')
    .select(`
      id,
      channels(id, name, thumbnail_url, yt_channel_id),
      videos(id, title, thumbnail_url, yt_video_id)
    `)
    .eq('list_id', id)
    .eq('status', 'yay')
    .order('created_at', { ascending: false })

  const items: ItemRow[] = (rawItems ?? []).map((item) => {
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

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center">
          <Link href="/admin">
            <Image src="/yay-logo-compact.svg" alt="YAY!" width={40} height={40} className="h-10 w-auto" />
          </Link>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">{list.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rediger biblioteksliste</p>
        </div>

        <ListEditUI list={list} items={items} allTags={allTags} activeTagIds={activeTagIds} />
      </div>
    </main>
  )
}
