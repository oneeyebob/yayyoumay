import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const listId = request.nextUrl.searchParams.get('listId')
  if (!listId) {
    return NextResponse.json({ error: 'Missing listId' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: items, error } = await admin
    .from('list_items')
    .select('id, channel_id, video_id, channels(name, thumbnail_url), videos(title, thumbnail_url)')
    .eq('list_id', listId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type RawItem = {
    id: string
    channel_id: string | null
    video_id: string | null
    channels: { name: string; thumbnail_url: string | null } | { name: string; thumbnail_url: string | null }[] | null
    videos: { title: string; thumbnail_url: string | null } | { title: string; thumbnail_url: string | null }[] | null
  }

  const channels: Array<{ itemId: string; name: string; thumbnail_url: string | null }> = []
  const videos: Array<{ itemId: string; title: string; thumbnail_url: string | null }> = []

  for (const item of (items ?? []) as RawItem[]) {
    if (item.channel_id && item.channels) {
      const ch = Array.isArray(item.channels) ? item.channels[0] : item.channels
      if (ch) channels.push({ itemId: item.id, name: ch.name, thumbnail_url: ch.thumbnail_url })
    } else if (item.video_id && item.videos) {
      const vid = Array.isArray(item.videos) ? item.videos[0] : item.videos
      if (vid) videos.push({ itemId: item.id, title: vid.title, thumbnail_url: vid.thumbnail_url })
    }
  }

  return NextResponse.json({ channels, videos })
}
