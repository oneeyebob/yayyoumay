import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getChannelVideos } from '@/lib/youtube/client'
import ProfilePicker from '@/components/shared/ProfilePicker'
import StaleCookieClearer from './StaleCookieClearer'

// ── Types ────────────────────────────────────────────────────────────────────

interface FeedVideo {
  ytVideoId: string
  title: string
  thumbnailUrl: string | null
}

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
  } | null
}

interface RawNayVideoItem {
  video: { yt_video_id: string } | null
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function JuniorPage() {
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

  if (listIds.length > 0) {
    // 6a. Load all yay'd list items (channels + videos)
    const { data: rawYayItems } = await supabase
      .from('list_items')
      .select(`
        id,
        channel_id,
        video_id,
        channel:channels(id, yt_channel_id, name, thumbnail_url),
        video:videos(id, yt_video_id, title, thumbnail_url)
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
      .map((v) => ({
        ytVideoId: v.yt_video_id,
        title: v.title,
        thumbnailUrl: v.thumbnail_url,
      }))

    // 6e. Fetch latest videos from each yay'd channel via YouTube API (in parallel).
    //     Nay'd videos are filtered out even if their channel is yay'd.
    const channelVideoArrays = await Promise.all(
      yayChannelItems.map(async (item) => {
        const ch = Array.isArray(item.channel) ? item.channel[0] : item.channel
        if (!ch?.yt_channel_id) return []
        try {
          const result = await getChannelVideos(ch.yt_channel_id, 20)
          return result.videos
            .filter((v) => !nayYtVideoIds.has(v.id))
            .map((v) => ({
              ytVideoId: v.id,
              title: v.title,
              thumbnailUrl: v.thumbnail.url,
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

  // ── Render feed ────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-gray-900">{activeProfile.name}</span>
        <Link
          href="/curator"
          className="text-xs text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-full px-3 py-1 transition-colors"
        >
          🎛 Kuratormode
        </Link>
      </header>

      {/* Feed */}
      <div className="px-4 py-6">
        {feedVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-4">🎬</p>
            <p className="text-gray-700 font-medium mb-1">Ingen videoer endnu</p>
            <p className="text-sm text-gray-400">
              Bed din kurator om at godkende noget indhold.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {feedVideos.map((video) => (
              <VideoCard key={video.ytVideoId} video={video} />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

// ── Feed card ─────────────────────────────────────────────────────────────────

function VideoCard({ video }: { video: FeedVideo }) {
  return (
    <li>
      <Link
        href={`/watch/${video.ytVideoId}`}
        className="block rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-200">
          {video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt={video.title}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-2xl">▶</div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <div className="bg-white/90 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-900">
                <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="px-2.5 py-2">
          <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug">
            {video.title}
          </p>
        </div>
      </Link>
    </li>
  )
}
