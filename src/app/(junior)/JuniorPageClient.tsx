'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { goHomeAction } from '../actions'
import JuniorFeed, { type FeedVideo, type FeedChannel } from './JuniorFeed'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActiveVideo {
  id: string
  title: string
}

interface Props {
  videos: FeedVideo[]
  channels: FeedChannel[]
  profileName: string
  initialTab?: 'videoer' | 'kanaler'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JuniorPageClient({ videos, channels, profileName, initialTab }: Props) {
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null)

  // Auto-play on mount: resume last played video if it's in the list, else play first
  useEffect(() => {
    if (videos.length === 0) return
    const lastId = localStorage.getItem('lastPlayedVideoId')
    const match = lastId ? videos.find((v) => v.ytVideoId === lastId) : null
    const target = match ?? videos[0]
    setActiveVideo({ id: target.ytVideoId, title: target.title })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Skip to next video when YouTube reports an error (e.g. video unavailable)
  useEffect(() => {
    if (!activeVideo) return
    function handleMessage(e: MessageEvent) {
      if (e.origin !== 'https://www.youtube.com') return
      let data: { event?: string } | null = null
      try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data } catch { return }
      if (data?.event !== 'onError') return
      const idx = videos.findIndex((v) => v.ytVideoId === activeVideo!.id)
      const next = videos[idx + 1]
      if (next) setActiveVideo({ id: next.ytVideoId, title: next.title })
      else setActiveVideo(null)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [activeVideo, videos])

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Sticky unit: header + player collapse into one sticky block */}
      <div className="sticky top-0 z-10 bg-white" style={{ paddingBottom: 15 }}>

        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
            <Link href="/" aria-label="Gå til feed">
              <img
                src="/yay-logo-compact.svg"
                alt="YAY!"
                className="h-10 w-auto transition-[filter] duration-200 hover:[filter:brightness(0)_saturate(100%)_invert(16%)_sepia(100%)_saturate(7481%)_hue-rotate(1deg)_brightness(103%)_contrast(104%)] active:[filter:brightness(0)_saturate(100%)_invert(10%)_sepia(100%)_saturate(9999%)_hue-rotate(1deg)_brightness(90%)]"
              />
            </Link>
            <div className="flex items-center gap-3">
              <form action={goHomeAction}>
                <button
                  type="submit"
                  aria-label={`Skift profil (${profileName})`}
                  className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm flex items-center justify-center hover:bg-indigo-200 active:bg-indigo-300 transition-colors"
                >
                  {profileName.charAt(0).toUpperCase()}
                </button>
              </form>
              <Link href="/curator" aria-label="Kuratormode">
                <img
                  src="/settings-icon.svg"
                  alt="Kuratormode"
                  className="h-6 w-6 mt-1 transition-[filter] duration-200 hover:[filter:brightness(0)_saturate(100%)_invert(16%)_sepia(100%)_saturate(7481%)_hue-rotate(1deg)_brightness(103%)_contrast(104%)] active:[filter:brightness(0)_saturate(100%)_invert(10%)_sepia(100%)_saturate(9999%)_hue-rotate(1deg)_brightness(90%)]"
                />
              </Link>
            </div>
          </div>
        </header>

        {/* Inline video player — shown when a video is selected */}
        {activeVideo && (
          <div>
          <div className="relative bg-black overflow-hidden max-h-[50vh] max-w-4xl mx-auto w-full">
            {/* relative + aspect-video gives a proper 16:9 box;
                overflow-hidden on the outer clips it at 50vh.
                iframe uses absolute inset-0 so it fills the box via
                the bounding rect rather than percentage height
                (percentage height doesn't resolve against aspect-ratio parents) */}
            <div className="relative aspect-video w-full">
              <iframe
                key={activeVideo.id}
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0&disablekb=1&modestbranding=1&enablejsapi=1`}
                title={activeVideo.title}
                allow="autoplay; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
              <div className="absolute top-0 left-0 right-0 z-50" style={{ height: 50 }} aria-hidden />
              <div className="absolute bottom-0 left-0 right-0 z-50" style={{ height: 60 }} aria-hidden />
              <div className="absolute bottom-20 right-4 z-50" style={{ width: 60, height: 50 }} aria-hidden />
            </div>

            {/* Close button */}
            <button
              onClick={() => setActiveVideo(null)}
              aria-label="Luk video"
              className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 active:bg-black transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-4 h-4"
                aria-hidden
              >
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </button>
          </div>
          </div>
        )}
      </div>

      {/* Scrollable feed below the sticky unit */}
      <JuniorFeed
        videos={videos}
        channels={channels}
        onVideoSelect={(v) => setActiveVideo(v)}
        activeVideoId={activeVideo?.id ?? null}
        initialTab={initialTab}
      />
    </main>
  )
}
