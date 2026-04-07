'use client'

import { useState } from 'react'
import { removeListItem } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChannelData {
  id: string
  name: string
  thumbnail_url: string | null
}

interface VideoData {
  id: string
  title: string
  thumbnail_url: string | null
}

export interface YayChannel {
  id: string
  channels: ChannelData | ChannelData[] | null
}

export interface YayVideo {
  id: string
  videos: VideoData | VideoData[] | null
}

interface Props {
  yayChannels: YayChannel[]
  yayVideos: YayVideo[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveChannel(item: YayChannel): ChannelData | null {
  const c = item.channels
  if (!c) return null
  return Array.isArray(c) ? (c[0] ?? null) : c
}

function resolveVideo(item: YayVideo): VideoData | null {
  const v = item.videos
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

// ── ItemRow ───────────────────────────────────────────────────────────────────

function ItemRow({
  id,
  title,
  thumbnailUrl,
  onRemoved,
}: {
  id: string
  title: string
  thumbnailUrl: string | null
  onRemoved: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function handleConfirm() {
    setRemoving(true)
    const { error } = await removeListItem(id)
    setRemoving(false)
    if (!error) onRemoved(id)
  }

  return (
    <div className="flex items-center gap-3 py-2">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded bg-gray-100 shrink-0" />
      )}
      <span className="flex-1 min-w-0 text-sm text-gray-800 line-clamp-1">{title}</span>
      {confirming ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500">Er du sikker?</span>
          <button
            onClick={handleConfirm}
            disabled={removing}
            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
          >
            {removing ? 'Fjerner…' : 'Ja, fjern'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={removing}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            Annuller
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="shrink-0 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Fjern
        </button>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function YayListUI({ yayChannels, yayVideos }: Props) {
  const [channels, setChannels] = useState(yayChannels)
  const [videos, setVideos] = useState(yayVideos)

  return (
    <div className="space-y-5">

      {/* Kanaler */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">Kanaler</h2>
        {channels.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Ingen YAY'd kanaler endnu</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {channels.map((item) => {
              const ch = resolveChannel(item)
              if (!ch) return null
              return (
                <ItemRow
                  key={item.id}
                  id={item.id}
                  title={ch.name}
                  thumbnailUrl={ch.thumbnail_url}
                  onRemoved={(id) => setChannels((prev) => prev.filter((c) => c.id !== id))}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Videoer */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">Videoer</h2>
        {videos.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Ingen YAY'd videoer endnu</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {videos.map((item) => {
              const v = resolveVideo(item)
              if (!v) return null
              return (
                <ItemRow
                  key={item.id}
                  id={item.id}
                  title={v.title}
                  thumbnailUrl={v.thumbnail_url}
                  onRemoved={(id) => setVideos((prev) => prev.filter((vi) => vi.id !== id))}
                />
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}
