import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getChannelVideos } from '@/lib/youtube/client'
import ProfilePicker from '@/components/shared/ProfilePicker'
import StaleCookieClearer from './StaleCookieClearer'
import { type FeedVideo, type FeedChannel } from './JuniorFeed'
import JuniorPageClient from './JuniorPageClient'

// Raw Supabase row shapes (cast via as unknown as)
interface RawYayItem {
  id: string
  channel_id: string | null
  video_id: string | null
  channel: {
    id: string
    yt_channel_id: string
    name: string
    thumbnail_url: string | null
  } | null
  video: {
    id: string
    yt_video_id: string
    title: string
    thumbnail_url: string | null
    channel: { name: string } | { name: string }[] | null
  } | null
}

interface RawNayVideoItem {
  video: { yt_video_id: string } | null
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function JuniorPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const initialTab: 'videoer' | 'kanaler' = tab === 'kanaler' ? 'kanaler' : 'videoer'

  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 2. Load all profiles for this user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_color')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (!profiles || profiles.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-8 text-center">
        <div>
          <p className="text-2xl mb-2">😕</p>
          <p className="text-gray-600 text-sm">Ingen profiler fundet. Opret en profil i kuratormode.</p>
        </div>
      </main>
    )
  }

  // 3. Check active profile cookie
  const cookieStore = await cookies()
  const activeProfileId = cookieStore.get('active_profile_id')?.value ?? null

  // Validate cookie value is actually a profile belonging to this user
  const activeProfile = activeProfileId
    ? profiles.find((p) => p.id === activeProfileId) ?? null
    : null

  // Cookie was set but doesn't belong to this user (e.g. leftover from a
  // different account). Show the picker and silently clear the stale cookie.
  const isStale = activeProfileId !== null && activeProfile === null

  // 4. No valid profile selected → show picker
  if (!activeProfile) {
    return (
      <>
        {isStale && <StaleCookieClearer />}
        <ProfilePicker profiles={profiles} />
      </>
    )
  }

  // 5. Load this profile's list IDs
  const { data: lists } = await supabase
    .from('lists')
    .select('id')
    .eq('profile_id', activeProfile.id)

  const listIds = lists?.map((l) => l.id) ?? []

  let feedVideos: FeedVideo[] = []
  let feedChannels: FeedChannel[] = []

  if (listIds.length > 0) {
    // 6a. Load all yay'd list items (channels + videos)
    const { data: rawYayItems } = await supabase
      .from('list_items')
      .select(`
        id,
        channel_id,
        video_id,
        channel:channels(id, yt_channel_id, name, thumbnail_url),
        video:videos(id, yt_video_id, title, thumbnail_url, channel:channels(name))
      `)
      .in('list_id', listIds)
      .eq('status', 'yay')
      .order('created_at', { ascending: false })

    const yayItems = (rawYayItems ?? []) as unknown as RawYayItem[]

    // 6b. Load nay'd video yt_video_ids so we can exclude them from channel feeds
    const { data: rawNayVideos } = await supabase
      .from('list_items')
      .select('video:videos(yt_video_id)')
      .in('list_id', listIds)
      .eq('status', 'nay')
      .not('video_id', 'is', null)

    const nayYtVideoIds = new Set<string>(
      ((rawNayVideos ?? []) as unknown as RawNayVideoItem[])
        .map((i) => i.video?.yt_video_id)
        .filter((id): id is string => !!id)
    )

    // 6c. Partition yay items into channels vs videos
    const yayChannelItems = yayItems.filter((i) => i.channel_id && !i.video_id)
    const yayVideoItems = yayItems.filter((i) => i.video_id)

    // 6d. Build explicit yay'd video cards (stored in DB, already curated)
    const explicitVideos: FeedVideo[] = yayVideoItems
      .map((i) => i.video)
      .filter((v): v is NonNullable<RawYayItem['video']> => v !== null && !!v.yt_video_id)
      .filter((v) => !nayYtVideoIds.has(v.yt_video_id))
      .map((v) => {
        const rawCh = v.channel
        const chName = Array.isArray(rawCh) ? rawCh[0]?.name : rawCh?.name
        return {
          ytVideoId: v.yt_video_id,
          title: v.title,
          thumbnailUrl: v.thumbnail_url,
          channelName: chName ?? undefined,
        }
      })

    // 6d-ii. Build channel cards for the Kanaler tab
    feedChannels = yayChannelItems
      .map((item) => {
        const ch = Array.isArray(item.channel) ? item.channel[0] : item.channel
        if (!ch?.yt_channel_id) return null
        return {
          ytChannelId: ch.yt_channel_id,
          name: ch.name,
          thumbnailUrl: ch.thumbnail_url,
        }
      })
      .filter((c): c is FeedChannel => c !== null)

    // 6e. Fetch latest videos from each yay'd channel, using channel_cache to
    //     avoid redundant YouTube API calls. If a channel was fetched within the
    //     last 24 hours AND we have ≥5 videos stored, serve from DB. Otherwise
    //     call the API, upsert results, and refresh the cache timestamp.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const channelVideoArrays = await Promise.all(
      yayChannelItems.map(async (item) => {
        const ch = Array.isArray(item.channel) ? item.channel[0] : item.channel
        if (!ch?.yt_channel_id || !ch?.id) return []

        // Check cache freshness
        const { data: cacheRow } = await supabase
          .from('channel_cache')
          .select('last_fetched_at')
          .eq('channel_id', ch.id)
          .single()

        const isFresh = cacheRow && cacheRow.last_fetched_at > cutoff

        if (isFresh) {
          // Serve from DB if we have enough videos
          const { data: cachedVideos } = await supabase
            .from('videos')
            .select('yt_video_id, title, thumbnail_url')
            .eq('channel_id', ch.id)
            .order('published_at', { ascending: false })
            .limit(20)

          if (cachedVideos && cachedVideos.length >= 5) {
            return cachedVideos
              .filter((v) => !nayYtVideoIds.has(v.yt_video_id))
              .map((v) => ({
                ytVideoId: v.yt_video_id,
                title: v.title,
                thumbnailUrl: v.thumbnail_url,
                channelName: ch.name,
              }))
          }

        }

        // Cache miss or stale — fetch from YouTube API
        try {
          const result = await getChannelVideos(ch.yt_channel_id, 20)

          // Upsert videos into DB
          if (result.videos.length > 0) {
            await supabase.from('videos').upsert(
              result.videos.map((v) => ({
                yt_video_id: v.id,
                channel_id: ch.id,
                title: v.title,
                thumbnail_url: v.thumbnail.url,
                duration_seconds: v.durationSeconds,
                published_at: v.publishedAt,
              })),
              { onConflict: 'yt_video_id' }
            )
          }

          // Refresh cache timestamp
          await supabase.from('channel_cache').upsert(
            { channel_id: ch.id, last_fetched_at: new Date().toISOString() },
            { onConflict: 'channel_id' }
          )

          return result.videos
            .filter((v) => !nayYtVideoIds.has(v.id))
            .map((v) => ({
              ytVideoId: v.id,
              title: v.title,
              thumbnailUrl: v.thumbnail.url,
              channelName: ch.name,
            }))
        } catch {
          // Quota exhausted, network error, etc. — degrade gracefully
          return []
        }
      })
    )

    const channelVideos: FeedVideo[] = channelVideoArrays.flat()

    // 6f. Merge: explicit yay'd videos first, then channel-fetched videos.
    //     Deduplicate by ytVideoId so a video yay'd AND from a yay'd channel
    //     only appears once.
    const seen = new Set<string>()
    for (const v of [...explicitVideos, ...channelVideos]) {
      if (!seen.has(v.ytVideoId)) {
        seen.add(v.ytVideoId)
        feedVideos.push(v)
      }
    }
  }

  // 7. Keyword filtering
  const { data: keywords } = await supabase
    .from('keyword_blacklist')
    .select('keyword')
    .eq('user_id', user.id)

  const blacklist = keywords?.map((k) => k.keyword.toLowerCase()) ?? []
  const filteredVideos = blacklist.length > 0
    ? feedVideos.filter((v) => !blacklist.some((kw) => v.title.toLowerCase().includes(kw)))
    : feedVideos

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <JuniorPageClient
      videos={filteredVideos}
      channels={feedChannels}
      profileName={activeProfile.name}
      initialTab={initialTab}
      listId={listIds[0] ?? null}
    />
  )
}
