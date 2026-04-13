import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
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

  // 2. Resolve active profile name from cookie
  const cookieStore = await cookies()
  const activeProfileId = cookieStore.get('active_profile_id')?.value ?? null
  let profileName = ''
  if (activeProfileId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', activeProfileId)
      .eq('user_id', user.id)
      .single()
    profileName = profile?.name ?? ''
  }

  // 4. Whitelist check
  const allowed = await isChannelWhitelisted(ytChannelId, user.id)
  if (!allowed) redirect('/')

  // 5. Load channel from DB
  const { data: channel } = await supabase
    .from('channels')
    .select('id, yt_channel_id, name, thumbnail_url')
    .eq('yt_channel_id', ytChannelId)
    .single()

  if (!channel) redirect('/')

  // 4. Fetch latest videos — use channel_cache to avoid redundant API calls.
  //    If fetched within 24h AND ≥5 videos in DB: serve from DB. Otherwise hit API.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  let apiVideos: { id: string; title: string; thumbnailUrl: string | null }[] = []
  let initialNextPageToken: string | null = null

  const { data: cacheRow } = await supabase
    .from('channel_cache')
    .select('last_fetched_at, next_page_token')
    .eq('channel_id', channel.id)
    .single()

  const isFresh = cacheRow && cacheRow.last_fetched_at > cutoff

  if (isFresh) {
    const { data: cachedVideos } = await supabase
      .from('videos')
      .select('yt_video_id, title, thumbnail_url')
      .eq('channel_id', channel.id)
      .order('published_at', { ascending: false })
      .limit(30)

    if (cachedVideos && cachedVideos.length >= 5) {
      apiVideos = cachedVideos.map((v) => ({
        id: v.yt_video_id,
        title: v.title,
        thumbnailUrl: v.thumbnail_url,
      }))
      initialNextPageToken = cacheRow.next_page_token ?? null
    }
  }

  if (apiVideos.length === 0) {
    try {
      const result = await getChannelVideos(ytChannelId, 30)
      initialNextPageToken = result.nextPageToken
      apiVideos = result.videos.map((v) => ({
        id: v.id,
        title: v.title,
        thumbnailUrl: v.thumbnail.url,
      }))

      if (result.videos.length > 0) {
        await supabase.from('videos').upsert(
          result.videos.map((v) => ({
            yt_video_id: v.id,
            channel_id: channel.id,
            title: v.title,
            thumbnail_url: v.thumbnail.url,
            duration_seconds: v.durationSeconds,
            published_at: v.publishedAt,
          })),
          { onConflict: 'yt_video_id' }
        )
      }

      await supabase.from('channel_cache').upsert(
        {
          channel_id: channel.id,
          last_fetched_at: new Date().toISOString(),
          next_page_token: result.nextPageToken,
        },
        { onConflict: 'channel_id' }
      )
    } catch {
      // Quota exhausted or network error — degrade gracefully
    }
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
      channelYtId={ytChannelId}
      videos={whitelistedVideos}
      initialNextPageToken={initialNextPageToken}
      profileName={profileName}
      listId={listIds[0] ?? null}
    />
  )
}
