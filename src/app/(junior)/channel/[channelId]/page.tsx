import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { isChannelWhitelisted } from '@/lib/whitelist'
import { getChannelVideos } from '@/lib/youtube/client'

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
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Back button */}
      <div className="px-4 pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Tilbage
        </Link>
      </div>

      {/* Channel header */}
      <header className="flex items-center gap-4 px-4 py-6">
        {channel.thumbnail_url ? (
          <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 ring-2 ring-white/10">
            <Image
              src={channel.thumbnail_url}
              alt={channel.name}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl shrink-0">
            📺
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold leading-tight">{channel.name}</h1>
          <p className="text-sm text-white/50 mt-0.5">
            {whitelistedVideos.length > 0
              ? `${whitelistedVideos.length} video${whitelistedVideos.length === 1 ? '' : 'er'}`
              : 'Kanal'}
          </p>
        </div>
      </header>

      {/* Divider */}
      <div className="border-t border-white/10 mx-4" />

      {/* Video grid */}
      <section className="px-4 py-5">
        {whitelistedVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-3xl mb-3">🎬</p>
            <p className="text-white/70 font-medium mb-1">Ingen videoer endnu</p>
            <p className="text-sm text-white/40">
              Kanalen har ingen tilgængelige videoer lige nu.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {whitelistedVideos.map((video) => (
              <li key={video.id}>
                <Link
                  href={`/watch/${video.id}`}
                  className="block rounded-xl overflow-hidden bg-gray-800 border border-white/5 group hover:border-white/20 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gray-700">
                    {video.thumbnailUrl ? (
                      <Image
                        src={video.thumbnailUrl}
                        alt={video.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:opacity-85 transition-opacity"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/30 text-2xl">
                        ▶
                      </div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/60 rounded-full p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                          <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium text-white/90 line-clamp-2 leading-snug">
                      {video.title}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
