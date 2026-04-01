'use client'

import { useState } from 'react'
import Image from 'next/image'
import { searchAction, yayNayAction, getDecisions } from '@/app/curator/actions'
import type { YouTubeSearchResult } from '@/lib/youtube/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'LEGO',       emoji: '🧱', query: 'LEGO' },
  { label: 'Minecraft',  emoji: '⛏️',  query: 'Minecraft' },
  { label: 'Madlavning', emoji: '👨‍🍳', query: 'Madlavning børn' },
  { label: 'Natur',      emoji: '🌿', query: 'Natur dokumentar' },
  { label: 'Musik',      emoji: '🎵', query: 'Børnemusik' },
  { label: 'Sport',      emoji: '⚽', query: 'Sport børn' },
  { label: 'Tegnefilm',  emoji: '🎬', query: 'Tegnefilm' },
  { label: 'Videnskab',  emoji: '🔬', query: 'Videnskab børn' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'yay' | 'nay'

// ── BrowseUI ──────────────────────────────────────────────────────────────────

export default function BrowseUI() {
  const [query, setQuery]           = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [results, setResults]       = useState<YouTubeSearchResult[]>([])
  const [searching, setSearching]   = useState(false)
  const [decisions, setDecisions]   = useState<Map<string, Status>>(new Map())
  const [selectedVideo, setSelectedVideo] = useState<YouTubeSearchResult | null>(null)
  // savingId = `${ytId}-${status}` while an action is in flight
  const [savingId, setSavingId]     = useState<string | null>(null)

  async function runSearch(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    setSearching(true)
    setActiveQuery(trimmed)
    setResults([])
    try {
      const res = await searchAction(trimmed)
      setResults(res.results)
      // Fetch existing decisions for this profile in parallel with render
      if (res.results.length > 0) {
        const dec = await getDecisions(
          res.results.map((r) => ({ kind: r.kind, ytId: r.id }))
        )
        setDecisions(new Map(Object.entries(dec)))
      }
    } catch {
      // degrade silently — search bar shows empty state
    } finally {
      setSearching(false)
    }
  }

  function clearSearch() {
    setQuery('')
    setActiveQuery('')
    setResults([])
    setDecisions(new Map())
  }

  async function handleDecision(result: YouTubeSearchResult, status: Status) {
    if (savingId) return // prevent concurrent saves
    const key = `${result.id}-${status}`
    setSavingId(key)

    const params =
      result.kind === 'video'
        ? {
            type: 'video' as const,
            ytId: result.id,
            ytTitle: result.title,
            ytThumbnail: result.thumbnail.url,
            channelId: result.channelId,
            channelTitle: result.channelTitle,
            status,
          }
        : {
            type: 'channel' as const,
            ytId: result.id,
            ytTitle: result.title,
            ytThumbnail: result.thumbnail.url,
            status,
          }

    const { error } = await yayNayAction(params)
    setSavingId(null)
    if (!error) {
      setDecisions((prev) => new Map(prev).set(result.id, status))
    }
  }

  const showCategories = !activeQuery
  const showResults    = !!activeQuery && !searching

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* ── Sticky search header ── */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-4 py-3">
          <form
            onSubmit={(e) => { e.preventDefault(); runSearch(query) }}
            className="flex gap-2"
          >
            {/* Input */}
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
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søg på YouTube..."
                aria-label="Søg på YouTube"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Ryd søgning"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="shrink-0 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {searching ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
              ) : 'Søg'}
            </button>
          </form>
        </div>

        {/* ── Content ── */}
        <div className="max-w-2xl mx-auto px-4 py-5">

          {/* Categories */}
          {showCategories && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Populære kategorier</h2>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => { setQuery(cat.query); runSearch(cat.query) }}
                    className="flex items-center gap-2.5 rounded-xl bg-white border border-gray-100 shadow-sm px-3 py-3.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:shadow-md active:scale-95 transition-all text-left"
                  >
                    <span className="text-xl shrink-0" aria-hidden>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Loading skeleton */}
          {searching && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-white border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-video bg-gray-200" />
                  <div className="p-2.5 space-y-1.5">
                    <div className="h-2.5 bg-gray-200 rounded w-full" />
                    <div className="h-2.5 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {showResults && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-3xl mb-4">🔍</p>
              <p className="text-gray-700 font-medium">Ingen resultater for &lsquo;{activeQuery}&rsquo;</p>
              <p className="text-sm text-gray-400 mt-1">Prøv et andet søgeord.</p>
            </div>
          )}

          {/* Results grid */}
          {showResults && results.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {results.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  decision={decisions.get(result.id) ?? null}
                  saving={savingId?.startsWith(result.id + '-') ?? false}
                  onDecision={(status) => handleDecision(result, status)}
                  onClick={() => {
                    if (result.kind === 'video') {
                      setSelectedVideo(result)
                    } else {
                      window.open(`https://www.youtube.com/channel/${result.id}`, '_blank', 'noopener,noreferrer')
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video preview modal */}
      {selectedVideo && (
        <VideoPreviewModal
          video={selectedVideo}
          decision={decisions.get(selectedVideo.id) ?? null}
          saving={savingId?.startsWith(selectedVideo.id + '-') ?? false}
          onDecision={(status) => handleDecision(selectedVideo, status)}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </>
  )
}

// ── ResultCard ────────────────────────────────────────────────────────────────

function ResultCard({
  result,
  decision,
  saving,
  onDecision,
  onClick,
}: {
  result: YouTubeSearchResult
  decision: Status | null
  saving: boolean
  onDecision: (status: Status) => void
  onClick: () => void
}) {
  const isVideo = result.kind === 'video'

  return (
    <div className="relative rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* Main clickable area */}
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left group"
        aria-label={result.title}
      >
        {/* Thumbnail */}
        <div className={`relative ${isVideo ? 'aspect-video' : 'aspect-square'} bg-gray-200`}>
          <Image
            src={result.thumbnail.url}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover group-hover:opacity-90 transition-opacity"
            unoptimized
          />

          {/* Status badge — top-left corner */}
          {decision && (
            <div
              className={`absolute top-1.5 left-1.5 flex items-center justify-center w-5 h-5 rounded-full shadow ${
                decision === 'yay' ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {decision === 'yay' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="white" className="w-3 h-3" aria-hidden>
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="white" className="w-3 h-3" aria-hidden>
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              )}
            </div>
          )}

          {/* Play icon hint for videos */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
              <div className="bg-white/80 rounded-full p-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-900" aria-hidden>
                  <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Title + channel — leave room for yay/nay buttons at bottom-right */}
        <div className="px-2.5 pt-2 pb-9">
          <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug">
            {result.title}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
            {isVideo ? result.channelTitle : 'Kanal'}
          </p>
        </div>
      </button>

      {/* Yay / Nay buttons — absolute, bottom-right, outside the main button */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        <YayNayMiniButton
          status="yay"
          active={decision === 'yay'}
          loading={saving}
          onClick={() => onDecision('yay')}
        />
        <YayNayMiniButton
          status="nay"
          active={decision === 'nay'}
          loading={saving}
          onClick={() => onDecision('nay')}
        />
      </div>
    </div>
  )
}

// ── YayNayMiniButton ──────────────────────────────────────────────────────────

function YayNayMiniButton({
  status,
  active,
  loading,
  onClick,
}: {
  status: Status
  active: boolean
  loading: boolean
  onClick: () => void
}) {
  const isYay = status === 'yay'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={isYay ? 'Yay — godkend' : 'Nay — afvis'}
      className={[
        'flex items-center justify-center w-7 h-7 rounded-lg text-sm transition-all shadow-sm',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        active
          ? isYay ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          : isYay
            ? 'bg-white/90 backdrop-blur-sm text-green-700 hover:bg-green-500 hover:text-white border border-green-200'
            : 'bg-white/90 backdrop-blur-sm text-red-700 hover:bg-red-500 hover:text-white border border-red-200',
      ].join(' ')}
    >
      {loading ? (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : (
        <span aria-hidden>{isYay ? '👍' : '👎'}</span>
      )}
    </button>
  )
}

// ── VideoPreviewModal ─────────────────────────────────────────────────────────

function VideoPreviewModal({
  video,
  decision,
  saving,
  onDecision,
  onClose,
}: {
  video: YouTubeSearchResult
  decision: Status | null
  saving: boolean
  onDecision: (status: Status) => void
  onClose: () => void
}) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={video.title}
    >
      {/* Card — bottom sheet on mobile, centered on sm+ */}
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video embed */}
        <div className="aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        {/* Info + actions */}
        <div className="px-4 pt-3 pb-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                {video.title}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{video.channelTitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Luk"
              className="shrink-0 rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden>
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          {/* Yay / Nay */}
          <div className="flex gap-2">
            {(['yay', 'nay'] as const).map((status) => {
              const isYay = status === 'yay'
              const active = decision === status
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onDecision(status)}
                  disabled={saving}
                  className={[
                    'flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    active
                      ? isYay ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      : isYay
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-red-50 text-red-700 hover:bg-red-100',
                  ].join(' ')}
                >
                  {saving ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                  ) : (
                    <span aria-hidden>{isYay ? '👍' : '👎'}</span>
                  )}
                  {isYay ? 'Yay' : 'Nay'}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
