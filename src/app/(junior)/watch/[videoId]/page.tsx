import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { isVideoWhitelisted } from '@/lib/whitelist'

interface WatchPageProps {
  params: Promise<{ videoId: string }>
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { videoId: ytVideoId } = await params

  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 2. Whitelist check
  const allowed = await isVideoWhitelisted(ytVideoId, user.id)
  if (!allowed) redirect('/')

  // 3. Load video details from our DB
  const { data: video } = await supabase
    .from('videos')
    .select(`
      id,
      yt_video_id,
      title,
      thumbnail_url,
      channel_id,
      channel:channels(id, yt_channel_id, name)
    `)
    .eq('yt_video_id', ytVideoId)
    .single()

  // Should always exist if whitelist passed, but guard anyway
  if (!video) redirect('/')

  const channel = Array.isArray(video.channel) ? video.channel[0] : video.channel

  // 4. Load other yay'd videos from the same channel
  //    Step A: get all video IDs for this channel in our DB
  const { data: siblingVideos } = await supabase
    .from('videos')
    .select('id, yt_video_id, title, thumbnail_url')
    .eq('channel_id', video.channel_id)
    .neq('yt_video_id', ytVideoId)
    .limit(20)

  const siblingIds = siblingVideos?.map((v) => v.id) ?? []

  //    Step B: which of those are yay'd by this user? (RLS scopes automatically)
  let nextVideos: typeof siblingVideos = []
  if (siblingIds.length > 0) {
    const { data: yayedItems } = await supabase
      .from('list_items')
      .select('video_id')
      .in('video_id', siblingIds)
      .eq('status', 'yay')

    const yayedSet = new Set(yayedItems?.map((i) => i.video_id) ?? [])
    nextVideos = (siblingVideos ?? []).filter((v) => yayedSet.has(v.id)).slice(0, 6)
  }

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
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        />
      </div>

      {/* Video info */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <h1 className="text-base font-bold text-gray-900 leading-snug">
          {video.title}
        </h1>
        {channel && (
          <p className="text-sm text-gray-500 mt-1">{channel.name}</p>
        )}
      </div>

      {/* Næste video */}
      {nextVideos && nextVideos.length > 0 && (
        <section className="bg-white px-4 py-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Næste video</h2>
          <ul className="space-y-3">
            {nextVideos.map((next) => (
              <li key={next.yt_video_id}>
                <Link
                  href={`/watch/${next.yt_video_id}`}
                  className="flex gap-3 group"
                >
                  {/* Thumbnail */}
                  <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-gray-200 shrink-0">
                    {next.thumbnail_url ? (
                      <Image
                        src={next.thumbnail_url}
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
                    {channel && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{channel.name}</p>
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
