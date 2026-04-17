'use client'

import { useState, useEffect } from 'react'
import { ShieldBan, ArrowBigLeft } from 'lucide-react'
import { goHomeAction } from '../actions'
import { nayVideoFromJunior } from '../curator/actions'
import SharedHeader from '@/components/shared/SharedHeader'
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
  listId: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JuniorPageClient({ videos, channels, profileName, initialTab, listId }: Props) {
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState<string | null>(null)
  const [history, setHistory] = useState<ActiveVideo[]>([])
  const [blockConfirm, setBlockConfirm] = useState(false)

  function selectVideo(video: ActiveVideo, { autoLoad = false } = {}) {
    if (video.id !== activeVideo?.id) {
      if (activeVideo) setHistory((prev) => [...prev.slice(-4), activeVideo])
      setIframeLoaded(autoLoad ? video.id : null)
      setBlockConfirm(false)
    }
    setActiveVideo(video)
  }

  function goBack() {
    const prev = history[history.length - 1]
    if (!prev) return
    setHistory((h) => h.slice(0, -1))
    setIframeLoaded(null)
    setBlockConfirm(false)
    setActiveVideo(prev)
  }

  async function handleBlock() {
    if (!activeVideo || !listId) return
    await nayVideoFromJunior(activeVideo.id, listId)
    setActiveVideo(null)
    setBlockConfirm(false)
  }

  // Auto-play on mount: resume last played video if it's in the list, else play first
  useEffect(() => {
    if (videos.length === 0) return
    const lastId = localStorage.getItem('lastPlayedVideoId')
    const match = lastId ? videos.find((v) => v.ytVideoId === lastId) : null
    const target = match ?? videos[0]
    setActiveVideo({ id: target.ytVideoId, title: target.title })
    setIframeLoaded(null)
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

  const playerJSX = (
    <div className="relative bg-black overflow-hidden max-w-4xl mx-auto w-full">
      <div className="relative aspect-video w-full">
        {iframeLoaded === activeVideo?.id ? (
          <>
            <iframe
              key={activeVideo.id}
              src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&rel=0&disablekb=1&modestbranding=1&enablejsapi=1&origin=https://yayyoumay.dk`}
              title={activeVideo.title}
              allow="autoplay; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
            <div className="absolute top-0 left-0 right-0 z-50" style={{ height: 50 }} aria-hidden />
            <div className="absolute bottom-0 left-0 right-0 z-50" style={{ height: 60 }} aria-hidden />
            <div className="absolute bottom-20 right-4 z-50" style={{ width: 60, height: 50 }} aria-hidden />
          </>
        ) : (
          <button
            onClick={() => activeVideo && setIframeLoaded(activeVideo.id)}
            aria-label={`Afspil ${activeVideo?.title}`}
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `url(https://img.youtube.com/vi/${activeVideo?.id}/hqdefault.jpg)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-black translate-x-0.5" aria-hidden>
                  <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => setActiveVideo(null)}
        aria-label="Luk video"
        className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 active:bg-black transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden>
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>

      {/* Block confirmation overlay */}
      {blockConfirm && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-50 gap-3">
          <p className="text-white font-semibold text-sm text-center px-4">Bloker denne video?</p>
          <div className="flex gap-2">
            <button
              onClick={handleBlock}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Ja, bloker
            </button>
            <button
              onClick={() => setBlockConfirm(false)}
              className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Annuller
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 md:landscape:flex md:landscape:flex-row md:landscape:h-screen md:landscape:overflow-hidden">

      {/* Left column — full width portrait, 75% landscape */}
      <div className="flex flex-col md:landscape:w-[75%] md:landscape:overflow-y-auto md:landscape:h-full">

        {/* Sticky unit: header + player */}
        <div className="sticky top-0 z-10 bg-white" style={{ paddingBottom: 15 }}>
          <SharedHeader
            showAvatar
            showSettingsIcon
            profileInitial={profileName.charAt(0).toUpperCase()}
            avatarHref="/curator/profiles"
            sticky={false}
          />
          {activeVideo && (
            <div>{playerJSX}</div>
          )}
        </div>

        {/* Tip — shown when no video is playing */}
        {!activeVideo && (
          <p className="text-xs text-center text-gray-400 mt-2">
            Tip: Log ind på YouTube i denne browser for den bedste oplevelse
          </p>
        )}

        {/* Video title/channel + action buttons — landscape only, below player */}
        {activeVideo && (() => {
          const meta = videos.find((v) => v.ytVideoId === activeVideo.id)
          return (
            <div className="hidden md:landscape:flex items-center justify-between gap-3 px-4 py-2 border-b border-gray-100 bg-white">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-900 line-clamp-1">{activeVideo.title}</p>
                {meta?.channelName && (
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{meta.channelName}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {history.length > 0 && (
                  <button
                    onClick={goBack}
                    aria-label="Tilbage"
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                  >
                    <ArrowBigLeft size={16} />
                  </button>
                )}
                {listId && (
                  <button
                    onClick={() => setBlockConfirm(true)}
                    aria-label="Bloker video"
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-red-700 text-white hover:bg-red-800 transition-colors"
                  >
                    <ShieldBan size={16} />
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        {/* Feed — tabs+search always visible, grid hidden in landscape (sidebar takes over) */}
        <div className="w-full">
          <JuniorFeed
            videos={videos}
            channels={channels}
            onVideoSelect={(v) => selectVideo(v, { autoLoad: true })}
            activeVideoId={activeVideo?.id ?? null}
            initialTab={initialTab}
            hideGridInLandscape
          />
        </div>
      </div>

      {/* Right column — sidebar, only visible in landscape */}
      <div className="hidden md:landscape:flex md:landscape:flex-col md:landscape:w-[25%] border-l border-gray-100 overflow-y-auto">
        <JuniorFeed
          videos={videos}
          channels={channels}
          onVideoSelect={(v) => selectVideo(v, { autoLoad: true })}
          activeVideoId={activeVideo?.id ?? null}
          sidebarMode
        />
      </div>
    </main>
  )
}
