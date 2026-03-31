'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { searchAction } from './actions'
import YayNayButtons from '@/components/shared/YayNayButtons'
import type { YouTubeSearchResult } from '@/lib/youtube/types'

export default function SearchUI() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<YouTubeSearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [isPending, startTransition] = useTransition()

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

  return (
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

      {/* Results */}
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

      {!isPending && searched && results.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-6">
          Ingen resultater for &ldquo;{query}&rdquo;.
        </p>
      )}

      {!isPending && results.length > 0 && (
        <ul className="space-y-3">
          {results.map((result) => (
            <li
              key={`${result.kind}-${result.id}`}
              className="flex gap-3 rounded-xl bg-white border border-gray-100 shadow-sm p-3"
            >
              {/* Thumbnail */}
              <div className="relative w-28 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                <Image
                  src={result.thumbnail.url}
                  alt={result.title}
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* Info + actions */}
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
                    {result.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {result.kind === 'video'
                      ? result.channelTitle
                      : `Kanal`}
                  </p>
                </div>

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
  )
}
