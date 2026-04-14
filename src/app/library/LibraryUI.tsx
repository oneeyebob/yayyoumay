'use client'

import { useState, useTransition } from 'react'
import { subscribeToList, unsubscribeFromList } from './actions'

export interface PublicList {
  id: string
  name: string
  description: string | null
  item_count: number
  channelThumbnails: string[]
}

interface Props {
  recommendedLists: PublicList[]
  communityLists: PublicList[]
  subscribedIds: string[]
  communityPage: number
  communityTotalPages: number
  currentQ: string
}

// ── ListCard ──────────────────────────────────────────────────────────────────

function ListCard({
  list,
  isSub,
  isLoading,
  onToggle,
}: {
  list: PublicList
  isSub: boolean
  isLoading: boolean
  onToggle: () => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{list.name}</p>
        <p className="text-xs text-gray-400 mt-1">{list.item_count} videoer / kanaler</p>
        {list.channelThumbnails.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {list.channelThumbnails.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-10 h-10 rounded-full object-cover bg-gray-100"
              />
            ))}
          </div>
        )}
        {list.description && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{list.description}</p>
        )}
      </div>
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          isSub
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-gray-900 text-white hover:bg-gray-700'
        }`}
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
        ) : isSub ? 'Abonnerer' : 'Abonnér'}
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LibraryUI({ recommendedLists, communityLists, subscribedIds, communityPage, communityTotalPages, currentQ }: Props) {
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set(subscribedIds))
  const [pending, setPending] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function toggle(listId: string) {
    if (pending) return
    setPending(listId)
    const isSubscribed = subscribed.has(listId)
    startTransition(async () => {
      try {
        if (isSubscribed) {
          await unsubscribeFromList(listId)
        } else {
          await subscribeToList(listId)
        }
        window.location.reload()
      } finally {
        setPending(null)
      }
    })
  }

  function pageLink(page: number) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    if (currentQ) params.set('q', currentQ)
    return `?${params.toString()}`
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">YayYouMay Bibliotek</h1>
          <p className="text-sm text-gray-500 mt-1">Kuratorerede samlinger du kan tilføje til din profil</p>
        </div>

        {/* Search — GET form, navigates to /library?q=... */}
        <form method="GET" action="/library" className="relative">
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
            name="q"
            defaultValue={currentQ}
            placeholder="Søg i samlinger..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
          />
        </form>

        {/* YayYouMay Anbefaler */}
        {(recommendedLists.length > 0 || !currentQ) && (
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">YayYouMay Anbefaler</h2>
              <p className="text-xs text-gray-400 mt-0.5">Udvalgt af YayYouMay-teamet</p>
            </div>
            {recommendedLists.length === 0 ? (
              <p className="text-sm text-gray-400">Ingen samlinger matcher din søgning.</p>
            ) : (
              <div className="space-y-3">
                {recommendedLists.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    isSub={subscribed.has(list.id)}
                    isLoading={pending === list.id}
                    onToggle={() => toggle(list.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Delt af forældre */}
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-gray-700">Delt af forældre</h2>
            <p className="text-xs text-gray-400 mt-0.5">Samlinger skabt og delt af andre forældre</p>
          </div>
          {communityLists.length === 0 && !currentQ ? (
            <p className="text-sm text-gray-400 italic">Ingen lister delt endnu — vær den første!</p>
          ) : communityLists.length === 0 ? (
            <p className="text-sm text-gray-400">Ingen samlinger matcher din søgning.</p>
          ) : (
            <div className="space-y-3">
              {communityLists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  isSub={subscribed.has(list.id)}
                  isLoading={pending === list.id}
                  onToggle={() => toggle(list.id)}
                />
              ))}
            </div>
          )}

          {communityTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <a
                href={communityPage > 1 ? pageLink(communityPage - 1) : undefined}
                aria-disabled={communityPage <= 1}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  communityPage <= 1
                    ? 'pointer-events-none text-gray-300'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                ← Forrige
              </a>
              <span className="text-sm text-gray-400">
                Side {communityPage} af {communityTotalPages}
              </span>
              <a
                href={communityPage < communityTotalPages ? pageLink(communityPage + 1) : undefined}
                aria-disabled={communityPage >= communityTotalPages}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  communityPage >= communityTotalPages
                    ? 'pointer-events-none text-gray-300'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Næste →
              </a>
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
