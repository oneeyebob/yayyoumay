import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { isChannelWhitelisted } from '@/lib/whitelist'

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

  // 4. Load all videos for this channel that are yay'd by this user
  //    Step A: get all videos for the channel in our DB
  const { data: channelVideos } = await supabase
    .from('videos')
    .select('id, yt_video_id, title, thumbnail_url')
    .eq('channel_id', channel.id)
    .order('published_at', { ascending: false })
    .limit(50)

  const videoIds = channelVideos?.map((v) => v.id) ?? []

  //    Step B: filter to those that are yay'd (RLS scopes to current user)
  let whitelistedVideos: typeof channelVideos = []
  if (videoIds.length > 0) {
    const { data: yayedItems } = await supabase
      .from('list_items')
      .select('video_id')
      .in('video_id', videoIds)
      .eq('status', 'yay')

    const yayedSet = new Set(yayedItems?.map((i) => i.video_id) ?? [])
    whitelistedVideos = (channelVideos ?? []).filter((v) => yayedSet.has(v.id))
  }

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
            {whitelistedVideos && whitelistedVideos.length > 0
              ? `${whitelistedVideos.length} godkendte video${whitelistedVideos.length === 1 ? '' : 'er'}`
              : 'Kanal'}
          </p>
        </div>
      </header>

      {/* Divider */}
      <div className="border-t border-white/10 mx-4" />

      {/* Video grid */}
      <section className="px-4 py-5">
        {!whitelistedVideos || whitelistedVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-3xl mb-3">🎬</p>
            <p className="text-white/70 font-medium mb-1">Ingen videoer endnu</p>
            <p className="text-sm text-white/40">
              Bed din kurator om at godkende videoer fra denne kanal.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {whitelistedVideos.map((video) => (
              <li key={video.yt_video_id}>
                <Link
                  href={`/watch/${video.yt_video_id}`}
                  className="block rounded-xl overflow-hidden bg-gray-800 border border-white/5 group hover:border-white/20 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gray-700">
                    {video.thumbnail_url ? (
                      <Image
                        src={video.thumbnail_url}
                        alt={video.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
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
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-5 h-5">
                          <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="px-2.5 py-2">
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
