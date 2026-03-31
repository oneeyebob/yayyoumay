'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { searchAction } from './actions'
import YayNayButtons from '@/components/shared/YayNayButtons'
import VideoPreviewModal from '@/components/shared/VideoPreviewModal'
import type { YouTubeSearchResult } from '@/lib/youtube/types'

interface PreviewState {
  videoId: string
  title: string
}

export default function SearchUI() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<YouTubeSearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<PreviewState | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return

    startTransition(async () => {
      const data = await searchAction(q)
      setResults(data.results)
      setSearched(true)
    })
  }

  function handleResultClick(result: YouTubeSearchResult) {
    if (result.kind === 'video') {
      setPreview({ videoId: result.id, title: result.title })
    } else {
      // Channels can't be embedded — open on YouTube in a new tab
      window.open(`https://www.youtube.com/channel/${result.id}`, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg efter kanaler eller videoer…"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isPending ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Søg'
            )}
          </button>
        </form>

        {/* Skeleton */}
        {isPending && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-xl bg-white border border-gray-100 p-3 animate-pulse">
                <div className="w-28 h-16 rounded-lg bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isPending && searched && results.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">
            Ingen resultater for &ldquo;{query}&rdquo;.
          </p>
        )}

        {/* Results */}
        {!isPending && results.length > 0 && (
          <ul className="space-y-3">
            {results.map((result) => (
              <li
                key={`${result.kind}-${result.id}`}
                className="flex gap-3 rounded-xl bg-white border border-gray-100 shadow-sm p-3"
              >
                {/* Clickable area: thumbnail + title */}
                <button
                  onClick={() => handleResultClick(result)}
                  className="flex gap-3 flex-1 min-w-0 text-left group focus:outline-none"
                  aria-label={
                    result.kind === 'video'
                      ? `Forhåndsvis: ${result.title}`
                      : `Åbn kanal på YouTube: ${result.title}`
                  }
                >
                  {/* Thumbnail */}
                  <div className="relative w-28 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                    <Image
                      src={result.thumbnail.url}
                      alt={result.title}
                      fill
                      sizes="112px"
                      className="object-cover transition-opacity group-hover:opacity-80"
                      unoptimized
                    />

                    {/* Type badge — top left */}
                    {result.kind === 'video' ? (
                      <span className="absolute top-1 left-1 rounded px-1 py-0.5 text-[10px] font-semibold bg-black/50 text-white leading-none">
                        Video
                      </span>
                    ) : (
                      <span className="absolute top-1 left-1 rounded px-1 py-0.5 text-[10px] font-semibold bg-teal-500/90 text-white leading-none">
                        Kanal
                      </span>
                    )}

                    {/* Play overlay for videos */}
                    {result.kind === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/60 rounded-full p-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-5 h-5">
                            <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* External link overlay + tooltip for channels */}
                    {result.kind === 'channel' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                          <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                          <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[9px] font-medium text-white/90 leading-none">Åbner på YouTube</span>
                      </div>
                    )}
                  </div>

                  {/* Title + subtitle */}
                  <div className="flex flex-col justify-center min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate leading-snug group-hover:text-blue-600 transition-colors">
                      {result.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {result.kind === 'video' ? result.channelTitle : 'Kanal'}
                    </p>
                  </div>
                </button>

                {/* Yay/Nay — separate from the clickable area */}
                <div className="flex items-end shrink-0">
                  <YayNayButtons
                    type={result.kind}
                    ytId={result.id}
                    ytTitle={result.title}
                    ytThumbnail={result.thumbnail.url}
                    channelId={result.kind === 'video' ? result.channelId : undefined}
                    channelTitle={result.kind === 'video' ? result.channelTitle : undefined}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Video preview modal */}
      <VideoPreviewModal
        isOpen={preview !== null}
        onClose={() => setPreview(null)}
        videoId={preview?.videoId ?? ''}
        title={preview?.title ?? ''}
      />
    </>
  )
}
