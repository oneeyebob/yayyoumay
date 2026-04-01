'use client'

import { useState, useEffect, useId } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { goHomeAction } from '@/app/actions'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActiveVideo {
  id: string
  title: string
}

export interface ChannelInfo {
  name: string
  thumbnailUrl: string | null
}

export interface ChannelVideo {
  id: string
  title: string
  thumbnailUrl: string | null
}

interface Props {
  channel: ChannelInfo
  videos: ChannelVideo[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChannelPageClient({ channel, videos }: Props) {
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null)
  const [query, setQuery] = useState('')
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [shuffled, setShuffled] = useState(true)
  const [shuffledOrder, setShuffledOrder] = useState<ChannelVideo[]>(videos)
  const inputId = useId()
  const listboxId = useId()

  // Shuffle client-side only to avoid SSR/client hydration mismatch
  useEffect(() => {
    setShuffledOrder([...videos].sort(() => Math.random() - 0.5))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play on mount: resume last played video if it's in this channel, else play first
  useEffect(() => {
    if (videos.length === 0) return
    const lastId = localStorage.getItem('lastPlayedVideoId')
    const match = lastId ? videos.find((v) => v.id === lastId) : null
    const target = match ?? videos[0]
    setActiveVideo({ id: target.id, title: target.title })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const trimmed = query.trim().toLowerCase()

  // ── Shuffle ────────────────────────────────────────────────────────────────

  function toggleShuffle() {
    if (!shuffled) {
      setShuffledOrder([...videos].sort(() => Math.random() - 0.5))
    }
    setShuffled((s) => !s)
  }

  const orderedVideos = shuffled ? shuffledOrder : videos

  // ── Filtered list ──────────────────────────────────────────────────────────

  const visibleVideos = trimmed
    ? orderedVideos.filter((v) => v.title.toLowerCase().includes(trimmed))
    : orderedVideos

  // ── Autocomplete suggestions ───────────────────────────────────────────────

  const suggestions: string[] = trimmed
    ? [...new Set(videos.map((v) => v.title).filter((t) => t.toLowerCase().includes(trimmed)))].slice(0, 5)
    : []

  function selectSuggestion(s: string) {
    setQuery(s)
    setShowSuggestions(false)
    setActiveSuggestion(-1)
  }

  function clearSearch() {
    setQuery('')
    setShowSuggestions(false)
    setActiveSuggestion(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestion((i) => (suggestions.length > 0 ? Math.min(i + 1, suggestions.length - 1) : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
        selectSuggestion(suggestions[activeSuggestion])
      } else {
        setShowSuggestions(false)
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setActiveSuggestion(-1)
    }
  }

  const noSearchMatch = visibleVideos.length === 0 && !!trimmed

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
          <span className="text-sm text-gray-500 truncate ml-3">{channel.name}</span>
        </header>

        {/* Inline video player — shown when a video is selected */}
        {activeVideo && (
          <div>
            <div className="relative bg-black overflow-hidden max-h-[50vh] max-w-4xl mx-auto w-full">
              <div className="relative aspect-video w-full">
                <iframe
                  key={activeVideo.id}
                  src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0&disablekb=1&modestbranding=1`}
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

      {/* Scrollable content */}
      <div className="px-4 py-4 space-y-4">

        {/* ── Channel identity + tab bar + shuffle ─────────────────────────── */}
        <div className="flex items-center gap-2 max-w-xl mx-auto w-full">

          {/* Avatar + name */}
          <div className="flex items-center gap-2 shrink-0">
            {channel.thumbnailUrl ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-gray-100">
                <Image
                  src={channel.thumbnailUrl}
                  alt={channel.name}
                  fill
                  sizes="32px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm shrink-0">
                📺
              </div>
            )}
            <p className="text-xs font-semibold text-gray-700 truncate max-w-[80px]">{channel.name}</p>
          </div>

          {/* Tabs */}
          <div className="flex-1 flex gap-1 bg-gray-100 rounded-xl p-1" role="tablist" aria-label="Indholdstype">
            {/* Videoer — always active on a channel page */}
            <div
              role="tab"
              aria-selected={true}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-white text-gray-900 shadow-sm"
            >
              Videoer
              {videos.length > 0 && (
                <span className="text-xs font-normal tabular-nums text-gray-400">
                  {videos.length}
                </span>
              )}
            </div>
            {/* Kanaler — navigates back to the junior feed's Kanaler tab */}
            <Link
              href="/?tab=kanaler"
              role="tab"
              aria-selected={false}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Kanaler
            </Link>
          </div>

          {/* Shuffle toggle */}
          <button
            onClick={toggleShuffle}
            aria-label={shuffled ? 'Slå bland fra' : 'Bland videoer'}
            aria-pressed={shuffled}
            className={[
              'shrink-0 flex items-center justify-center rounded-xl w-9 h-9 transition-colors',
              shuffled
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600',
            ].join(' ')}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-hidden
            >
              <path d="M3 6.5h8.5q2 0 3.5 1.5M3 13.5h8.5q2 0 3.5-1.5" />
              <path d="M13 4.5l2.5 2-2.5 2" />
              <path d="M13 11.5l2.5 2-2.5 2" />
              <line x1="3" y1="6.5" x2="8" y2="13.5" />
            </svg>
          </button>
        </div>

        {/* ── Search + autocomplete ────────────────────────────────────────── */}
        <div className="relative max-w-xl mx-auto w-full">
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
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSuggestions(true)
              setActiveSuggestion(-1)
            }}
            onFocus={() => { if (query.trim()) setShowSuggestions(true) }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Søg i videoer..."
            aria-label="Søg i kanalens videoer"
            aria-autocomplete="list"
            aria-controls={showSuggestions && suggestions.length > 0 ? listboxId : undefined}
            aria-activedescendant={activeSuggestion >= 0 ? `${listboxId}-opt-${activeSuggestion}` : undefined}
            aria-expanded={showSuggestions && suggestions.length > 0}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
          />

          {/* Clear button */}
          {query.trim() && (
            <button
              onClick={clearSearch}
              aria-label="Ryd søgning"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </button>
          )}

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Søgeforslag"
              className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg divide-y divide-gray-50 overflow-hidden"
            >
              {suggestions.map((s, i) => (
                <li
                  key={s}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={activeSuggestion === i}
                  onMouseDown={() => selectSuggestion(s)}
                  className={[
                    'flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer select-none',
                    activeSuggestion === i
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-gray-700 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-3.5 h-3.5 shrink-0 text-gray-400"
                    aria-hidden
                  >
                    <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate">{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Video grid ───────────────────────────────────────────────────── */}
        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-4">🎬</p>
            <p className="text-gray-700 font-medium mb-1">Ingen videoer endnu</p>
            <p className="text-sm text-gray-400">Kanalen har ingen tilgængelige videoer lige nu.</p>
          </div>
        ) : noSearchMatch ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-3xl mb-4">🔍</p>
            <p className="text-gray-700 font-medium">
              Ingen resultater for &lsquo;{trimmed}&rsquo;
            </p>
            <p className="text-sm text-gray-400 mt-1">Prøv et andet søgeord.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-4xl mx-auto w-full">
            {visibleVideos.map((video) => (
              <li key={video.id}>
                <button
                  onClick={() => {
                    localStorage.setItem('lastPlayedVideoId', video.id)
                    setActiveVideo({ id: video.id, title: video.title })
                  }}
                  className={[
                    'block w-full text-left rounded-xl overflow-hidden bg-white border shadow-sm hover:shadow-md transition-shadow group',
                    activeVideo?.id === video.id
                      ? 'border-blue-400 ring-2 ring-blue-300'
                      : 'border-gray-100',
                  ].join(' ')}
                >
                  {/* 16:9 thumbnail */}
                  <div className="relative aspect-video bg-gray-200">
                    {video.thumbnailUrl ? (
                      <Image
                        src={video.thumbnailUrl}
                        alt={video.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-2xl">
                        ▶
                      </div>
                    )}
                    {/* Play / now-playing overlay */}
                    <div className={[
                      'absolute inset-0 flex items-center justify-center transition-opacity bg-black/20',
                      activeVideo?.id === video.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    ].join(' ')}>
                      <div className={[
                        'rounded-full p-2',
                        activeVideo?.id === video.id ? 'bg-blue-500/90' : 'bg-white/90',
                      ].join(' ')}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white" aria-hidden>
                          <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="px-1.5 pt-1.5 pb-2 space-y-0.5">
                    <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug">
                      {video.title}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
