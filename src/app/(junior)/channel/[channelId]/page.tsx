import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isChannelWhitelisted } from '@/lib/whitelist'
import { getChannelVideos } from '@/lib/youtube/client'
import ChannelPageClient from './ChannelPageClient'

interface ChannelPageProps {
  params: Promise<{ channelId: string }>
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { channelId: ytChannelId } = await params

  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 2. Whitelist check
  const allowed = await isChannelWhitelisted(ytChannelId, user.id)
  if (!allowed) redirect('/')

  // 3. Load channel from DB
  const { data: channel } = await supabase
    .from('channels')
    .select('id, yt_channel_id, name, thumbnail_url')
    .eq('yt_channel_id', ytChannelId)
    .single()

  if (!channel) redirect('/')

  // 4. Fetch latest videos from YouTube API (same logic as junior feed)
  let apiVideos: { id: string; title: string; thumbnailUrl: string | null }[] = []
  try {
    const result = await getChannelVideos(ytChannelId, 30)
    apiVideos = result.videos.map((v) => ({
      id: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnail.url,
    }))
  } catch {
    // Quota exhausted or network error — degrade gracefully
  }

  // 5. Load explicitly nay'd yt_video_ids for this user so we can exclude them
  //    lists → profiles → user (no direct user_id on lists)
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)

  const profileIds = profilesData?.map((p) => p.id) ?? []

  const { data: listsData } = profileIds.length > 0
    ? await supabase.from('lists').select('id').in('profile_id', profileIds)
    : { data: [] }

  const listIds = listsData?.map((l) => l.id) ?? []

  const nayYtVideoIds = new Set<string>()

  if (listIds.length > 0) {
    // Resolve nay'd list_items → video rows → yt_video_id
    const { data: nayItems } = await supabase
      .from('list_items')
      .select('video:videos(yt_video_id)')
      .in('list_id', listIds)
      .eq('status', 'nay')
      .not('video_id', 'is', null)

    for (const item of nayItems ?? []) {
      const vid = Array.isArray(item.video) ? item.video[0] : item.video
      if (vid?.yt_video_id) nayYtVideoIds.add(vid.yt_video_id)
    }
  }

  // 6. Filter out nay'd videos
  const whitelistedVideos = apiVideos.filter((v) => !nayYtVideoIds.has(v.id))

  return (
    <ChannelPageClient
      channel={{ name: channel.name, thumbnailUrl: channel.thumbnail_url }}
      videos={whitelistedVideos}
    />
  )
}
