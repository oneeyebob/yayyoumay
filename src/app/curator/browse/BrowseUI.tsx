'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { searchAction, yayVideoFromEmbed, yayChannelFromEmbed, getPopularVideosAction } from '@/app/curator/actions'
import type { YouTubeSearchResult } from '@/lib/youtube/types'

// Unified internal video shape used by the grid and player
interface BrowseVideo {
  id: string
  title: string
  thumbnailUrl: string
  channelTitle: string
}

function fromSearchResult(r: YouTubeSearchResult): BrowseVideo {
  return { id: r.id, title: r.title, thumbnailUrl: r.thumbnail.url, channelTitle: r.channelTitle }
}

interface Props {
  profileName: string | null
  initialVideos: YouTubeSearchResult[]
  langFilter: string | null
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function BrowseUI({ profileName, initialVideos, langFilter }: Props) {
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<BrowseVideo[]>([])
  const [isSearching, startSearch] = useTransition()
  // Initialize with first 24 unshuffled to avoid SSR/client hydration mismatch.
  // Shuffle client-side only after mount.
  const [popularVideos, setPopularVideos] = useState<BrowseVideo[]>(
    initialVideos.slice(0, 24).map(fromSearchResult)
  )
  useEffect(() => {
    console.log('[BrowseUI] initialVideos count:', initialVideos.length, initialVideos.slice(0, 2))
    setPopularVideos(shuffle(initialVideos.map(fromSearchResult)).slice(0, 24))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [isShaking, startShake] = useTransition()
  const [activeVideo, setActiveVideo] = useState<BrowseVideo | null>(null)
  const [saving, setSaving] = useState<'video' | 'channel' | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'video' | 'channel'; ok: boolean } | null>(null)

  const isShowingSearch = searchedQuery !== null
  const visibleVideos = isShowingSearch ? searchResults : popularVideos

  function handleShake() {
    startShake(async () => {
      const fresh = await getPopularVideosAction(langFilter)
      setPopularVideos(shuffle(fresh.map(fromSearchResult)).slice(0, 24))
      setSearchedQuery(null)
      setSearchResults([])
      setQuery('')
    })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    startSearch(async () => {
      const firstLang = langFilter?.split(',')[0]?.trim() || undefined
      const res = await searchAction(q, firstLang ? { language: firstLang } : undefined)
      setSearchResults(res.results.filter((r) => r.kind === 'video').map(fromSearchResult))
      setSearchedQuery(q)
    })
  }

  function clearSearch() {
    setQuery('')
    setSearchedQuery(null)
    setSearchResults([])
  }

  function handleSelect(video: BrowseVideo) {
    setActiveVideo(video)
    setFeedback(null)
  }

  async function handleYayVideo() {
    if (!activeVideo || saving) return
    setSaving('video')
    const res = await yayVideoFromEmbed(activeVideo.id)
    setSaving(null)
    setFeedback({ type: 'video', ok: !res.error })
  }

  async function handleYayChannel() {
    if (!activeVideo || saving) return
    setSaving('channel')
    const res = await yayChannelFromEmbed(activeVideo.id)
    setSaving(null)
    setFeedback({ type: 'channel', ok: !res.error })
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Sticky unit: header + player + YAY buttons */}
      <div className="sticky top-0 z-10 bg-white" style={{ paddingBottom: activeVideo ? 12 : 0 }}>

        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <Link
            href="/curator"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5" aria-hidden>
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            Tilbage
          </Link>

          <Link href="/curator" aria-label="Indstillinger">
            <img
              src="/yay-logo.svg"
              alt="YAY!"
              className="h-20 w-auto transition-[filter] duration-200 hover:[filter:brightness(0)_saturate(100%)_invert(16%)_sepia(100%)_saturate(7481%)_hue-rotate(1deg)_brightness(103%)_contrast(104%)]"
            />
          </Link>

          {profileName ? (
            <div
              className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm flex items-center justify-center"
              aria-label={profileName}
            >
              {profileName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-8" />
          )}
        </header>

        {/* Inline player */}
        {activeVideo && (
          <div>
            <div className="relative bg-black overflow-hidden max-h-[50vh] max-w-4xl mx-auto w-full">
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

              <button
                onClick={() => setActiveVideo(null)}
                aria-label="Luk video"
                className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden>
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              </button>
            </div>

            {/* YAY buttons + feedback */}
            <div className="max-w-4xl mx-auto px-4 pt-3 space-y-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleYayVideo}
                  disabled={saving !== null}
                  className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 h-14 text-sm font-bold text-white transition-colors shadow-sm"
                >
                  {saving === 'video' ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <img src="/yay-logo.svg" className="h-20 w-auto brightness-0 invert leading-none" alt="" aria-hidden />
                  )}
                  Video
                </button>
                <button
                  type="button"
                  onClick={handleYayChannel}
                  disabled={saving !== null}
                  className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 h-14 text-sm font-bold text-white transition-colors shadow-sm"
                >
                  {saving === 'channel' ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <img src="/yay-logo.svg" className="h-20 w-auto brightness-0 invert leading-none" alt="" aria-hidden />
                  )}
                  Kanal
                </button>
              </div>

              {feedback && (
                <p className={`text-xs text-center font-medium ${feedback.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {feedback.ok
                    ? feedback.type === 'video' ? 'Video gemt ✓' : 'Kanal godkendt ✓'
                    : 'Noget gik galt — prøv igen'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="px-4 py-4 space-y-4">

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              aria-hidden
            >
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søg på YouTube…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="shrink-0 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSearching ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
            ) : 'Søg'}
          </button>
          {isShowingSearch ? (
            <button
              type="button"
              onClick={clearSearch}
              className="shrink-0 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Ryd
            </button>
          ) : (
            <button
              type="button"
              onClick={handleShake}
              disabled={isShaking}
              title="Ryst posen"
              className="shrink-0 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              {isShaking ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              ) : '🎲'}
            </button>
          )}
        </form>

        {/* Section heading */}
        {!isSearching && (
          <div className="max-w-4xl mx-auto w-full">
            <h2 className="text-sm font-semibold text-gray-700">
              {isShowingSearch
                ? `Søgeresultater for "${searchedQuery}"`
                : 'Populære videoer'}
            </h2>
          </div>
        )}

        {/* Loading skeleton */}
        {isSearching && (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-4xl mx-auto w-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="rounded-xl bg-white border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-video bg-gray-200" />
                <div className="p-2 space-y-1.5">
                  <div className="h-2.5 bg-gray-200 rounded w-full" />
                  <div className="h-2.5 bg-gray-200 rounded w-2/3" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* No search results */}
        {isShowingSearch && !isSearching && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-3xl mb-4">😕</p>
            <p className="text-gray-700 font-medium">Ingen resultater for &ldquo;{searchedQuery}&rdquo;</p>
            <p className="text-sm text-gray-400 mt-1">Prøv et andet søgeord.</p>
          </div>
        )}

        {/* Video grid */}
        {!isSearching && visibleVideos.length > 0 && (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-4xl mx-auto w-full">
            {visibleVideos.map((video) => (
              <ResultCard
                key={video.id}
                video={video}
                isActive={activeVideo?.id === video.id}
                onSelect={handleSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

// ── ResultCard ────────────────────────────────────────────────────────────────

function ResultCard({
  video,
  isActive,
  onSelect,
}: {
  video: BrowseVideo
  isActive: boolean
  onSelect: (v: BrowseVideo) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(video)}
        className={[
          'block w-full text-left rounded-xl overflow-hidden bg-white border shadow-sm hover:shadow-md transition-shadow group',
          isActive ? 'border-blue-400 ring-2 ring-blue-300' : 'border-gray-100',
        ].join(' ')}
      >
        <div className="relative aspect-video bg-gray-200">
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
            unoptimized
          />
          <div className={[
            'absolute inset-0 flex items-center justify-center transition-opacity bg-black/20',
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          ].join(' ')}>
            <div className={['rounded-full p-2', isActive ? 'bg-blue-500/90' : 'bg-white/90'].join(' ')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white" aria-hidden>
                <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="px-1.5 pt-1.5 pb-2 h-14 flex flex-col justify-start overflow-hidden">
          <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug">{video.title}</p>
          {video.channelTitle && (
            <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{video.channelTitle}</p>
          )}
        </div>
      </button>
    </li>
  )
}
