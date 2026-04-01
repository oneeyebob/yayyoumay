'use client'

import { useState, useId } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeedVideo {
  ytVideoId: string
  title: string
  thumbnailUrl: string | null
  channelName?: string
}

export interface FeedChannel {
  ytChannelId: string
  name: string
  thumbnailUrl: string | null
}

interface JuniorFeedProps {
  videos: FeedVideo[]
  channels: FeedChannel[]
}

type Tab = 'videoer' | 'kanaler'

// ── Main component ────────────────────────────────────────────────────────────

export default function JuniorFeed({ videos, channels }: JuniorFeedProps) {
  const [tab, setTab] = useState<Tab>('videoer')
  const [query, setQuery] = useState('')
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputId = useId()
  const listboxId = useId()

  const trimmed = query.trim().toLowerCase()

  // ── Filtered lists ───────────────────────────────────────────────────────

  const visibleVideos = trimmed
    ? videos.filter((v) => v.title.toLowerCase().includes(trimmed))
    : videos

  const visibleChannels = trimmed
    ? channels.filter((c) => c.name.toLowerCase().includes(trimmed))
    : channels

  // ── Autocomplete suggestions ─────────────────────────────────────────────

  const sourceTitles =
    tab === 'videoer' ? videos.map((v) => v.title) : channels.map((c) => c.name)

  const suggestions: string[] = trimmed
    ? [...new Set(sourceTitles.filter((t) => t.toLowerCase().includes(trimmed)))].slice(0, 5)
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

  function handleTabChange(next: Tab) {
    setTab(next)
    clearSearch()
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

  // ── Derived state ────────────────────────────────────────────────────────

  const isEmpty = tab === 'videoer' ? videos.length === 0 : channels.length === 0
  const visibleForTab = tab === 'videoer' ? visibleVideos : visibleChannels
  const noSearchMatch = !isEmpty && visibleForTab.length === 0 && !!trimmed

  return (
    <div className="px-4 py-4 space-y-4">

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1" role="tablist" aria-label="Indholdstype">
        {(['videoer', 'kanaler'] as Tab[]).map((t) => {
          const count = t === 'videoer' ? videos.length : channels.length
          return (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => handleTabChange(t)}
              className={[
                'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {t === 'videoer' ? 'Videoer' : 'Kanaler'}
              {count > 0 && (
                <span
                  className={[
                    'text-xs font-normal tabular-nums',
                    tab === t ? 'text-gray-400' : 'text-gray-400',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Search + autocomplete ──────────────────────────────────────────── */}
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
          onChange={(e) => {
            setQuery(e.target.value)
            setShowSuggestions(true)
            setActiveSuggestion(-1)
          }}
          onFocus={() => { if (query.trim()) setShowSuggestions(true) }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={tab === 'videoer' ? 'Søg i videoer...' : 'Søg i kanaler...'}
          aria-label={tab === 'videoer' ? 'Søg i godkendte videoer' : 'Søg i godkendte kanaler'}
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

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-4xl mb-4">{tab === 'videoer' ? '🎬' : '📺'}</p>
          <p className="text-gray-700 font-medium mb-1">
            {tab === 'videoer' ? 'Ingen videoer endnu' : 'Ingen kanaler endnu'}
          </p>
          <p className="text-sm text-gray-400">
            Bed din kurator om at godkende noget indhold.
          </p>
        </div>
      ) : noSearchMatch ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-3xl mb-4">🔍</p>
          <p className="text-gray-700 font-medium">
            Ingen resultater for &lsquo;{trimmed}&rsquo;
          </p>
          <p className="text-sm text-gray-400 mt-1">Prøv et andet søgeord.</p>
        </div>
      ) : tab === 'videoer' ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleVideos.map((video) => (
            <VideoCard key={video.ytVideoId} video={video} />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleChannels.map((ch) => (
            <ChannelCard key={ch.ytChannelId} channel={ch} />
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
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <div className="bg-white/90 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-900" aria-hidden>
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
          {video.channelName && (
            <p className="text-[11px] text-gray-400 truncate">{video.channelName}</p>
          )}
        </div>
      </Link>
    </li>
  )
}

// ── Channel card ──────────────────────────────────────────────────────────────

function ChannelCard({ channel }: { channel: FeedChannel }) {
  return (
    <li>
      <Link
        href={`/channel/${channel.ytChannelId}`}
        className="flex flex-col items-center gap-2 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-3 group"
      >
        {/* Circular avatar — max ~80px */}
        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-200 shrink-0 ring-2 ring-gray-100 group-hover:ring-gray-200 transition-all">
          {channel.thumbnailUrl ? (
            <Image
              src={channel.thumbnailUrl}
              alt={channel.name}
              fill
              sizes="56px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xl">
              📺
            </div>
          )}
        </div>

        {/* Name */}
        <p className="text-xs font-semibold text-gray-900 text-center line-clamp-2 leading-snug">
          {channel.name}
        </p>
      </Link>
    </li>
  )
}
