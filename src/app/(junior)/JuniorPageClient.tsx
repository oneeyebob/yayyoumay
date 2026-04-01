'use client'

import { useState } from 'react'
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

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Sticky unit: header + player collapse into one sticky block */}
      <div className="sticky top-0 z-10 bg-white">

        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <form action={goHomeAction}>
            <button
              type="submit"
              className="flex items-center transition-[filter] duration-200 hover:[filter:brightness(0)_saturate(100%)_invert(16%)_sepia(100%)_saturate(7481%)_hue-rotate(1deg)_brightness(103%)_contrast(104%)] active:[filter:brightness(0)_saturate(100%)_invert(10%)_sepia(100%)_saturate(9999%)_hue-rotate(1deg)_brightness(90%)]"
              aria-label="Gå til profilvalg"
            >
              <img src="/yay-logo.svg" alt="YAY!" className="h-20 w-auto" />
            </button>
          </form>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{profileName}</span>
            <Link
              href="/curator"
              className="text-xs text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-full px-3 py-1 transition-colors"
            >
              🎛 Kuratormode
            </Link>
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
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0&disablekb=1&modestbranding=1`}
                title={activeVideo.title}
                allow="autoplay; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
              {/* Click-blocking overlay — covers the YouTube logo and "more videos"
                  strip at the bottom of the iframe so children can't tap out */}
              <div
                className="absolute bottom-0 left-0 right-0 z-10"
                style={{ height: 60, pointerEvents: 'auto' }}
                aria-hidden
              />
              {/* Click-blocking overlay — covers the fullscreen button
                  in the top-right corner of the iframe */}
              <div
                className="absolute top-0 right-0 z-10"
                style={{ width: 50, height: 50, pointerEvents: 'auto' }}
                aria-hidden
              />
              {/* Click-blocking overlay — covers the channel name and logo
                  in the top bar of the iframe */}
              <div
                className="absolute top-0 left-0 right-0 z-10"
                style={{ height: 50, pointerEvents: 'auto' }}
                aria-hidden
              />
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
