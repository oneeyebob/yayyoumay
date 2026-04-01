'use client'

import { useState, useId } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeedVideo {
  ytVideoId: string
  title: string
  thumbnailUrl: string | null
}

interface JuniorFeedProps {
  videos: FeedVideo[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JuniorFeed({ videos }: JuniorFeedProps) {
  const [query, setQuery] = useState('')
  const inputId = useId()

  const trimmed = query.trim()

  const visible = trimmed
    ? videos.filter((v) =>
        v.title.toLowerCase().includes(trimmed.toLowerCase())
      )
    : videos

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Search bar */}
      <div className="relative">
        {/* Search icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>

        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg i dit indhold..."
          aria-label="Søg i godkendt indhold"
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
        />

        {/* Clear button */}
        {trimmed && (
          <button
            onClick={() => setQuery('')}
            aria-label="Ryd søgning"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
            </svg>
          </button>
        )}
      </div>

      {/* Results */}
      {videos.length === 0 ? (
        // Feed is empty (no approved content at all)
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-4xl mb-4">🎬</p>
          <p className="text-gray-700 font-medium mb-1">Ingen videoer endnu</p>
          <p className="text-sm text-gray-400">
            Bed din kurator om at godkende noget indhold.
          </p>
        </div>
      ) : visible.length === 0 ? (
        // Search returned no matches
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-3xl mb-4">🔍</p>
          <p className="text-gray-700 font-medium">
            Ingen resultater for &lsquo;{trimmed}&rsquo;
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Prøv et andet søgeord.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((video) => (
            <VideoCard key={video.ytVideoId} video={video} />
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Video card ────────────────────────────────────────────────────────────────

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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-900" aria-hidden>
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
