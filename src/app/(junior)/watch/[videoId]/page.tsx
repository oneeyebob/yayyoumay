import { redirect } from 'next/navigation'
import { after } from 'next/server'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getVideo, getChannelVideos } from '@/lib/youtube/client'

interface WatchPageProps {
  params: Promise<{ videoId: string }>
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface NextVideo {
  ytVideoId: string
  title: string
  thumbnailUrl: string | null
}

interface RawNayVideoItem {
  video: { yt_video_id: string } | null
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WatchPage({ params }: WatchPageProps) {
  const { videoId: ytVideoId } = await params
  const supabase = await createClient()

  // ── Auth ───────────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Load video from DB (fast path) ────────────────────────────────────────
  const { data: dbVideo } = await supabase
    .from('videos')
    .select(`
      id,
      yt_video_id,
      title,
      thumbnail_url,
      channel_id,
      duration_seconds,
      published_at,
      channel:channels(id, yt_channel_id, name)
    `)
    .eq('yt_video_id', ytVideoId)
    .single()

  // ── Resolve rendering state ────────────────────────────────────────────────
  // Filled in by whichever authorization path succeeds.
  let videoTitle = ''
  let videoThumbnail: string | null = null
  let channelName: string | null = null
  let internalChannelId: string | null = null
  let ytChannelId: string | null = null
  // true when access is granted via channel yay (not an explicit video yay).
  // Controls which "next videos" source is used.
  let channelWhitelisted = false

  // ── Authorization ──────────────────────────────────────────────────────────

  if (dbVideo) {
    // We have a local record — do the full priority check without an API call.
    const ch = Array.isArray(dbVideo.channel) ? dbVideo.channel[0] : dbVideo.channel

    // 1. Explicit nay on this video — always blocks, even if channel is yay'd.
    const { count: nayCount } = await supabase
      .from('list_items')
      .select('id', { count: 'exact', head: true })
      .eq('video_id', dbVideo.id)
      .eq('status', 'nay')
    if ((nayCount ?? 0) > 0) redirect('/')

    // 2. Explicit yay on this video.
    const { count: videoYayCount } = await supabase
      .from('list_items')
      .select('id', { count: 'exact', head: true })
      .eq('video_id', dbVideo.id)
      .eq('status', 'yay')

    if ((videoYayCount ?? 0) > 0) {
      videoTitle = dbVideo.title
      videoThumbnail = dbVideo.thumbnail_url
      channelName = ch?.name ?? null
      internalChannelId = dbVideo.channel_id
      ytChannelId = ch?.yt_channel_id ?? null
      channelWhitelisted = false
    } else {
      // 3. Channel yay — video's parent channel is whitelisted.
      const { count: channelYayCount } = await supabase
        .from('list_items')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', dbVideo.channel_id)
        .eq('status', 'yay')

      if ((channelYayCount ?? 0) > 0) {
        videoTitle = dbVideo.title
        videoThumbnail = dbVideo.thumbnail_url
        channelName = ch?.name ?? null
        internalChannelId = dbVideo.channel_id
        ytChannelId = ch?.yt_channel_id ?? null
        channelWhitelisted = true
      } else {
        redirect('/')
      }
    }
  } else {
    // Video is not in our DB — it came from getChannelVideos() on a whitelisted
    // channel. Fetch from YouTube to learn its channelId, then verify the
    // channel is yay'd.
    let ytVideo: Awaited<ReturnType<typeof getVideo>> | null = null
    try {
      ytVideo = await getVideo(ytVideoId)
    } catch {
      // Quota exhausted, video deleted, network error — deny access.
      redirect('/')
    }

    // Channel must exist in our DB (it was curated at some point for a yay
    // to be possible).
    const { data: dbChannel } = await supabase
      .from('channels')
      .select('id, name')
      .eq('yt_channel_id', ytVideo.channelId)
      .single()

    if (!dbChannel) redirect('/') // Never curated → deny.

    // Check channel yay (no explicit video nay/yay possible since video
    // isn't in our DB — you can't have a list_item for an unknown video).
    const { count: channelYayCount } = await supabase
      .from('list_items')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', dbChannel.id)
      .eq('status', 'yay')

    if ((channelYayCount ?? 0) === 0) redirect('/')

    // Authorized via channel whitelist.
    videoTitle = ytVideo.title
    videoThumbnail = ytVideo.thumbnail.url
    channelName = ytVideo.channelTitle
    internalChannelId = dbChannel.id
    ytChannelId = ytVideo.channelId
    channelWhitelisted = true

    // Fire-and-forget: cache the video in our DB so future visits use the
    // fast path and the curator can see/nay it from the profile detail page.
    const cachedYtVideo = ytVideo
    const cachedDbChannelId = dbChannel.id
    after(async () => {
      const bgSupabase = await createClient()
      await bgSupabase.from('videos').upsert(
        {
          yt_video_id: ytVideoId,
          title: cachedYtVideo.title,
          thumbnail_url: cachedYtVideo.thumbnail.url,
          channel_id: cachedDbChannelId,
          duration_seconds: cachedYtVideo.durationSeconds,
          published_at: cachedYtVideo.publishedAt,
        },
        { onConflict: 'yt_video_id', ignoreDuplicates: true }
      )
    })
  }

  // ── "Næste video" ─────────────────────────────────────────────────────────

  let nextVideos: NextVideo[] = []

  if (channelWhitelisted && ytChannelId && internalChannelId) {
    // Channel-whitelisted: all sibling videos are potentially visible.
    // Fetch from YouTube API and exclude any that have been explicitly nay'd.

    // Get nay'd yt_video_ids across all this user's lists (RLS scopes to user).
    const { data: rawNayVideos } = await supabase
      .from('list_items')
      .select('video:videos(yt_video_id)')
      .eq('status', 'nay')
      .not('video_id', 'is', null)

    const nayYtVideoIds = new Set<string>(
      ((rawNayVideos ?? []) as unknown as RawNayVideoItem[])
        .map((i) => i.video?.yt_video_id)
        .filter((id): id is string => !!id)
    )

    try {
      const channelResult = await getChannelVideos(ytChannelId, 21)
      nextVideos = channelResult.videos
        .filter((v) => v.id !== ytVideoId && !nayYtVideoIds.has(v.id))
        .slice(0, 6)
        .map((v) => ({
          ytVideoId: v.id,
          title: v.title,
          thumbnailUrl: v.thumbnail.url,
        }))
    } catch {
      // Quota exhausted or API error — degrade gracefully with no sidebar.
    }
  } else if (!channelWhitelisted && internalChannelId) {
    // Explicit video yay: show other explicitly yay'd videos from same channel.
    const { data: siblingVideos } = await supabase
      .from('videos')
      .select('id, yt_video_id, title, thumbnail_url')
      .eq('channel_id', internalChannelId)
      .neq('yt_video_id', ytVideoId)
      .limit(20)

    const siblingIds = siblingVideos?.map((v) => v.id) ?? []

    if (siblingIds.length > 0) {
      const { data: yayedItems } = await supabase
        .from('list_items')
        .select('video_id')
        .in('video_id', siblingIds)
        .eq('status', 'yay')

      const yayedSet = new Set(yayedItems?.map((i) => i.video_id) ?? [])
      nextVideos = (siblingVideos ?? [])
        .filter((v) => yayedSet.has(v.id))
        .slice(0, 6)
        .map((v) => ({
          ytVideoId: v.yt_video_id,
          title: v.title,
          thumbnailUrl: v.thumbnail_url,
        }))
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-black">
      {/* Back button */}
      <div className="px-4 pt-4 pb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Tilbage
        </Link>
      </div>

      {/* Video embed — 16:9 full width */}
      <div className="w-full aspect-video bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&rel=0&modestbranding=1`}
          title={videoTitle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        />
      </div>

      {/* Video info */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <h1 className="text-base font-bold text-gray-900 leading-snug">
          {videoTitle}
        </h1>
        {channelName && (
          <p className="text-sm text-gray-500 mt-1">{channelName}</p>
        )}
      </div>

      {/* Næste video */}
      {nextVideos.length > 0 && (
        <section className="bg-white px-4 py-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Næste video</h2>
          <ul className="space-y-3">
            {nextVideos.map((next) => (
              <li key={next.ytVideoId}>
                <Link href={`/watch/${next.ytVideoId}`} className="flex gap-3 group">
                  {/* Thumbnail */}
                  <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-gray-200 shrink-0">
                    {next.thumbnailUrl ? (
                      <Image
                        src={next.thumbnailUrl}
                        alt={next.title}
                        fill
                        sizes="128px"
                        className="object-cover group-hover:opacity-90 transition-opacity"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">▶</div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/50 rounded-full p-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="white" className="w-4 h-4">
                          <path d="M5.04 2.27A1 1 0 0 0 3.5 3.16v9.68a1 1 0 0 0 1.54.84l7.94-4.84a1 1 0 0 0 0-1.68L5.04 2.27Z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="flex flex-col justify-center min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                      {next.title}
                    </p>
                    {channelName && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{channelName}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
