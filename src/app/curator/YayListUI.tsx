'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { removeListItem, blockItemInOwnList } from './actions'
import { unsubscribeFromList } from '@/app/library/actions'

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

export interface NayVideo {
  id: string
  videos: VideoData | VideoData[] | null
}

export interface SubscribedList {
  id: string
  name: string
  channels: Array<{ itemId: string; channelId: string; name: string; thumbnail_url: string | null }>
  videos: Array<{ itemId: string; videoId: string; title: string; thumbnail_url: string | null }>
}

interface Props {
  yayChannels: YayChannel[]
  yayVideos: YayVideo[]
  nayVideos: NayVideo[]
  subscribedLists: SubscribedList[]
  ownListId: string | null
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
  removeLabel = 'Fjern',
  onRemoved,
}: {
  id: string
  title: string
  thumbnailUrl: string | null
  removeLabel?: string
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
          {removeLabel}
        </button>
      )}
    </div>
  )
}

// ── BlockRow — for subscribed items ──────────────────────────────────────────

function BlockRow({
  title,
  thumbnailUrl,
  channelId,
  videoId,
  ownListId,
  onBlocked,
}: {
  title: string
  thumbnailUrl: string | null
  channelId: string | null
  videoId: string | null
  ownListId: string
  onBlocked: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [blocking, setBlocking] = useState(false)

  async function handleConfirm() {
    setBlocking(true)
    await blockItemInOwnList(channelId, videoId, ownListId)
    setBlocking(false)
    onBlocked()
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
            disabled={blocking}
            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
          >
            {blocking ? 'Blokerer…' : 'Ja, bloker'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={blocking}
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

// ── SubscriptionCard ──────────────────────────────────────────────────────────

function SubscriptionCard({
  list,
  ownListId,
}: {
  list: SubscribedList
  ownListId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [channels, setChannels] = useState(list.channels)
  const [videos, setVideos] = useState(list.videos)
  const [unsubscribing, setUnsubscribing] = useState(false)
  const [, startTransition] = useTransition()

  function handleUnsubscribe() {
    setUnsubscribing(true)
    startTransition(async () => {
      await unsubscribeFromList(list.id)
      window.location.reload()
    })
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-2 text-left"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          >
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-semibold text-gray-800">{list.name}</span>
          <span className="text-xs text-gray-400 ml-1">
            {channels.length + videos.length} emner
          </span>
        </button>
        <button
          onClick={handleUnsubscribe}
          disabled={unsubscribing}
          className="shrink-0 text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
        >
          {unsubscribing ? 'Opsiger…' : 'Opsig abonnement'}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 divide-y divide-gray-100">
          {channels.length === 0 && videos.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-3">Ingen emner i denne samling</p>
          ) : (
            <>
              {channels.map((ch) => (
                <BlockRow
                  key={ch.itemId}
                  title={ch.name}
                  thumbnailUrl={ch.thumbnail_url}
                  channelId={ch.channelId}
                  videoId={null}
                  ownListId={ownListId}
                  onBlocked={() => setChannels((prev) => prev.filter((c) => c.itemId !== ch.itemId))}
                />
              ))}
              {videos.map((v) => (
                <BlockRow
                  key={v.itemId}
                  title={v.title}
                  thumbnailUrl={v.thumbnail_url}
                  channelId={null}
                  videoId={v.videoId}
                  ownListId={ownListId}
                  onBlocked={() => setVideos((prev) => prev.filter((vi) => vi.itemId !== v.itemId))}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function YayListUI({ yayChannels, yayVideos, nayVideos, subscribedLists, ownListId }: Props) {
  const [channels, setChannels] = useState(yayChannels)
  const [videos, setVideos] = useState(yayVideos)
  const [blocked, setBlocked] = useState(nayVideos)

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

      {/* Blokerede videoer */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">Blokerede videoer</h2>
        {blocked.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Ingen blokerede videoer</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {blocked.map((item) => {
              const v = resolveVideo(item)
              if (!v) return null
              return (
                <ItemRow
                  key={item.id}
                  id={item.id}
                  title={v.title}
                  thumbnailUrl={v.thumbnail_url}
                  removeLabel="Fjern blokering"
                  onRemoved={(id) => setBlocked((prev) => prev.filter((b) => b.id !== id))}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Abonnementer */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">Abonnementer</h2>
        {subscribedLists.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Du har ingen abonnementer endnu.{' '}
            <Link href="/library" className="underline hover:text-gray-600 transition-colors">
              Gå til Biblioteket for at abonnere.
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {subscribedLists.map((list) =>
              ownListId ? (
                <SubscriptionCard key={list.id} list={list} ownListId={ownListId} />
              ) : null
            )}
          </div>
        )}
      </section>

    </div>
  )
}
