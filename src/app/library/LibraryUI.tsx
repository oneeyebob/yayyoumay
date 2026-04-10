'use client'

import { useState, useTransition } from 'react'
import { subscribeToList, unsubscribeFromList } from './actions'

export interface PublicList {
  id: string
  name: string
  description: string | null
  item_count: number
}

interface Props {
  lists: PublicList[]
  subscribedIds: string[]
}

export default function LibraryUI({ lists, subscribedIds }: Props) {
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

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">YayYouMay Bibliotek</h1>
          <p className="text-sm text-gray-500 mt-1">Kuratorerede samlinger du kan tilføje til din profil</p>
        </div>

        <div className="space-y-4">
          {lists.map((list) => {
            const isSub = subscribed.has(list.id)
            const isLoading = pending === list.id
            return (
              <div
                key={list.id}
                className="bg-white rounded-2xl shadow-sm p-6 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{list.name}</p>
                  {list.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{list.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{list.item_count} videoer / kanaler</p>
                </div>
                <button
                  onClick={() => toggle(list.id)}
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
          })}

          {lists.length === 0 && (
            <p className="text-sm text-gray-400">Ingen offentlige samlinger endnu.</p>
          )}
        </div>
      </div>
    </main>
  )
}
