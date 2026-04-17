'use client'

import { useState, useId, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
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
  onVideoSelect?: (video: { id: string; title: string }) => void
  activeVideoId?: string | null
  initialTab?: Tab
  controlledTab?: Tab
  onTabChange?: (t: Tab) => void
  sidebarMode?: boolean
  hideGridInLandscape?: boolean
  tabsRight?: ReactNode
}

type Tab = 'videoer' | 'kanaler'

// ── Main component ────────────────────────────────────────────────────────────

export default function JuniorFeed({ videos, channels, onVideoSelect, activeVideoId, initialTab, controlledTab, onTabChange, sidebarMode, hideGridInLandscape, tabsRight }: JuniorFeedProps) {
  const router = useRouter()
  // Always provide a handler — fallback to router navigation so VideoCard
  // never silently falls through to the <Link> path
  const handleVideoSelect = onVideoSelect ?? ((v: { id: string }) => router.push(`/watch/${v.id}`))
  const [tab, setTab] = useState<Tab>(initialTab ?? 'videoer')
  const activeTab = controlledTab ?? tab
  const [query, setQuery] = useState('')
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [page, setPage] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const inputId = useId()
  const listboxId = useId()

  const PAGE_SIZE = 18
  const trimmed = query.trim().toLowerCase()

  // ── Filtered lists ───────────────────────────────────────────────────────

  const filteredVideos = trimmed
    ? videos.filter((v) => v.title.toLowerCase().includes(trimmed))
    : videos

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / PAGE_SIZE))
  const visibleVideos = filteredVideos.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const visibleChannels = trimmed
    ? channels.filter((c) => c.name.toLowerCase().includes(trimmed))
    : channels

  // ── Autocomplete suggestions ─────────────────────────────────────────────

  const sourceTitles =
    activeTab === 'videoer' ? videos.map((v) => v.title) : channels.map((c) => c.name)

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
    setPage(0)
  }

  function handleTabChange(next: Tab) {
    setTab(next)
    onTabChange?.(next)
    clearSearch()
  }

  function handlePageChange(next: number) {
    setPage(next)
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  const isEmpty = activeTab === 'videoer' ? videos.length === 0 : channels.length === 0
  const visibleForTab = activeTab === 'videoer' ? filteredVideos : visibleChannels
  const noSearchMatch = !isEmpty && visibleForTab.length === 0 && !!trimmed

  if (sidebarMode) {
    return (
      <div className="flex flex-col gap-3 p-2">
        {activeTab === 'kanaler' ? (
          channels.map((channel) => (
            <Link
              key={channel.ytChannelId}
              href={`/channel/${channel.ytChannelId}`}
              className="w-full text-left hover:opacity-80 transition-opacity"
            >
              <div className="relative aspect-video w-full rounded-md overflow-hidden bg-gray-200">
                {channel.thumbnailUrl ? (
                  <Image
                    src={channel.thumbnailUrl}
                    alt={channel.name}
                    fill
                    sizes="25vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">📺</div>
                )}
              </div>
              <p className="text-[11px] font-medium text-gray-900 line-clamp-2 mt-1 leading-tight">{channel.name}</p>
            </Link>
          ))
        ) : (
          videos.map((video) => (
            <button
              key={video.ytVideoId}
              onClick={() => handleVideoSelect({ id: video.ytVideoId, title: video.title })}
              className="w-full text-left hover:opacity-80 transition-opacity"
            >
              <div className={[
                'relative aspect-video w-full rounded-md overflow-hidden bg-gray-200',
                activeVideoId === video.ytVideoId ? 'border-2 border-[#c8e6a0]' : '',
              ].join(' ')}>
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    fill
                    sizes="25vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">▶</div>
                )}
              </div>
              <p className="text-[11px] font-medium text-gray-900 line-clamp-2 mt-1 leading-tight">{video.title}</p>
              {video.channelName && (
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{video.channelName}</p>
              )}
            </button>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-4">

      {/* ── Tabs + shuffle ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 max-w-xl mx-auto w-full">
        <div className="flex-1 flex gap-1 bg-gray-100 rounded-xl p-1" role="tablist" aria-label="Indholdstype">
          {(['videoer', 'kanaler'] as Tab[]).map((t) => {
            const count = t === 'videoer' ? videos.length : channels.length
            return (
              <button
                key={t}
                role="tab"
                aria-selected={activeTab ===t}
                onClick={() => handleTabChange(t)}
                className={[
                  'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  activeTab ===t
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                {t === 'videoer' ? 'Videoer' : 'Kanaler'}
                {count > 0 && (
                  <span className="text-xs font-normal tabular-nums text-gray-400">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {tabsRight}
      </div>

      {/* ── Search + autocomplete ──────────────────────────────────────────── */}
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
            setPage(0)
          }}
          onFocus={() => { if (query.trim()) setShowSuggestions(true) }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={activeTab ==='videoer' ? 'Søg i videoer...' : 'Søg i kanaler...'}
          aria-label={activeTab ==='videoer' ? 'Søg i godkendte videoer' : 'Søg i godkendte kanaler'}
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
      <div className={hideGridInLandscape ? 'tablet-landscape:hidden' : 'tablet-landscape:block'}>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-4xl mb-4">{activeTab ==='videoer' ? '🎬' : '📺'}</p>
          <p className="text-gray-700 font-medium mb-1">
            {activeTab ==='videoer' ? 'Ingen videoer endnu' : 'Ingen kanaler endnu'}
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
      ) : activeTab ==='videoer' ? (
        <div ref={gridRef} className="space-y-3 max-w-4xl mx-auto w-full">
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
                className="px-3 py-1 rounded-lg border border-gray-200 bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"
                aria-label="Forrige side"
              >
                ←
              </button>
              <span className="text-sm text-gray-600" >
                Side {page + 1} af {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded-lg border border-gray-200 bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"
                aria-label="Næste side"
              >
                →
              </button>
            </div>
          )}
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
            {visibleVideos.map((video, i) => (
              <VideoCard
                key={video.ytVideoId}
                video={video}
                onSelect={handleVideoSelect}
                isActive={activeVideoId === video.ytVideoId}
                priority={i < 4}
              />
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
                className="px-3 py-1 rounded-lg border border-gray-200 bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"
                aria-label="Forrige side"
              >
                ←
              </button>
              <span className="text-sm text-gray-600" >
                Side {page + 1} af {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded-lg border border-gray-200 bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"
                aria-label="Næste side"
              >
                →
              </button>
            </div>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-4xl mx-auto w-full">
          {visibleChannels.map((ch, i) => (
            <ChannelCard key={ch.ytChannelId} channel={ch} priority={i < 4} />
          ))}
        </ul>
      )}
      </div>
    </div>
  )
}

// ── Video card ────────────────────────────────────────────────────────────────

function VideoCard({
  video,
  onSelect,
  isActive,
  priority = false,
}: {
  video: FeedVideo
  onSelect: (v: { id: string; title: string }) => void  // always required — caller provides fallback
  isActive?: boolean
  priority?: boolean
}) {
  const cardClass = [
    'block w-full text-left rounded-xl overflow-hidden bg-white border shadow-sm hover:shadow-md transition-shadow group',
    isActive ? 'border-blue-400 ring-2 ring-blue-300' : 'border-gray-100',
  ].join(' ')

  const inner = (
    <>
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
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-2xl">
            ▶
          </div>
        )}
        {/* Play / now-playing overlay */}
        <div className={[
          'absolute inset-0 flex items-center justify-center transition-opacity bg-black/20',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}>
          <div className={[
            'rounded-full p-2',
            isActive ? 'bg-blue-500/90' : 'bg-white/90',
          ].join(' ')}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white" aria-hidden>
              <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="px-1.5 pt-1.5 pb-2 h-[4.5rem] flex flex-col justify-between overflow-hidden">
        <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">
          {video.title}
        </p>
        {video.channelName && (
          <p className="text-[11px] text-gray-400 truncate">{video.channelName}</p>
        )}
      </div>
    </>
  )

  if (onSelect) {
    return (
      <li>
        <button onClick={() => onSelect({ id: video.ytVideoId, title: video.title })} className={cardClass}>
          {inner}
        </button>
      </li>
    )
  }

  return (
    <li>
      <Link href={`/watch/${video.ytVideoId}`} className={cardClass}>
        {inner}
      </Link>
    </li>
  )
}

// ── Channel card ──────────────────────────────────────────────────────────────

function ChannelCard({ channel, priority = false }: { channel: FeedChannel; priority?: boolean }) {
  return (
    <li>
      <Link
        href={`/channel/${channel.ytChannelId}`}
        className="block w-full text-left rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
      >
        {/* 16:9 thumbnail */}
        <div className="relative aspect-video bg-gray-200">
          {channel.thumbnailUrl ? (
            <Image
              src={channel.thumbnailUrl}
              alt={channel.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
              unoptimized
              priority={priority}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-2xl">
              📺
            </div>
          )}
        </div>

        {/* Name */}
        <div className="px-1.5 pt-1.5 pb-2">
          <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug">
            {channel.name}
          </p>
        </div>
      </Link>
    </li>
  )
}
