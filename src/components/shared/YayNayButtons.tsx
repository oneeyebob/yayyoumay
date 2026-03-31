'use client'

import { useState } from 'react'
import { yayNayAction, getLists, type YayNayParams, type ListOption } from '@/app/curator/actions'

const LS_KEY = 'yay_last_list_id'

type Decision = 'yay' | 'nay' | null

interface YayNayButtonsProps {
  type: 'channel' | 'video'
  ytId: string
  ytTitle: string
  ytThumbnail: string
  channelId?: string
  channelTitle?: string
}

export default function YayNayButtons({
  type,
  ytId,
  ytTitle,
  ytThumbnail,
  channelId,
  channelTitle,
}: YayNayButtonsProps) {
  const [decision, setDecision] = useState<Decision>(null)
  const [loading, setLoading] = useState<Decision>(null)
  const [error, setError] = useState<string | null>(null)

  // Yay list picker state
  const [pickerOpen, setPickerOpen] = useState(false)
  const [lists, setLists] = useState<ListOption[] | null>(null)
  const [listsLoading, setListsLoading] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string>('')

  async function openYayPicker() {
    setPickerOpen(true)
    if (lists !== null) return // already fetched — just show picker

    setListsLoading(true)
    const result = await getLists()
    setListsLoading(false)
    setLists(result)

    if (result.length > 0) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null
      const preferred = (saved ? result.find((l) => l.id === saved) : null) ?? result[0]
      setSelectedListId(preferred.id)
    }
  }

  async function confirmYay() {
    if (!selectedListId) return
    localStorage.setItem(LS_KEY, selectedListId)
    setPickerOpen(false)
    await handle('yay', selectedListId)
  }

  async function handle(status: 'yay' | 'nay', listId?: string) {
    setError(null)
    setLoading(status)

    const params: YayNayParams = {
      type,
      ytId,
      ytTitle,
      ytThumbnail,
      channelId,
      channelTitle,
      status,
      listId,
    }

    const { error: actionError } = await yayNayAction(params)
    setLoading(null)

    if (actionError) {
      setError(actionError)
      return
    }

    setDecision(status)
  }

  const isLoading = loading !== null

  // ── Yay area ────────────────────────────────────────────────────────────────

  let yayArea: React.ReactNode

  if (decision === 'yay') {
    // Decided — show solid green
    yayArea = (
      <button
        disabled
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold bg-green-500 text-white cursor-default"
      >
        <span aria-hidden>👍</span>
        Yay
      </button>
    )
  } else if (loading === 'yay') {
    // Saving after picker confirm
    yayArea = (
      <button
        disabled
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold bg-green-50 text-green-700 opacity-50 cursor-not-allowed"
      >
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Yay
      </button>
    )
  } else if (pickerOpen) {
    // List picker inline
    yayArea = (
      <div className="flex items-center gap-1 rounded-lg bg-green-50 border border-green-200 px-2 py-1">
        {listsLoading ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-600 border-t-transparent mx-1" />
        ) : lists && lists.length === 0 ? (
          <span className="text-xs text-gray-500 px-1">Ingen lister — opret en liste først</span>
        ) : (
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="text-xs text-gray-700 bg-transparent border-none focus:outline-none max-w-[130px] truncate"
          >
            {(lists ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {l.profileName}
              </option>
            ))}
          </select>
        )}

        {/* Confirm */}
        {!listsLoading && lists && lists.length > 0 && (
          <button
            onClick={confirmYay}
            disabled={!selectedListId}
            className="rounded px-2 py-0.5 text-xs font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors shrink-0"
          >
            👍 Gem
          </button>
        )}

        {/* Cancel */}
        <button
          onClick={() => setPickerOpen(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-0.5"
          aria-label="Luk"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
          </svg>
        </button>
      </div>
    )
  } else {
    // Idle Yay button
    yayArea = (
      <button
        onClick={openYayPicker}
        disabled={isLoading}
        aria-label="Yay — godkend"
        className={[
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all',
          'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-400',
          'disabled:cursor-not-allowed disabled:opacity-50',
          decision === 'nay'
            ? 'bg-gray-100 text-gray-400'
            : 'bg-green-50 text-green-700 hover:bg-green-100',
        ].join(' ')}
      >
        <span aria-hidden>👍</span>
        Yay
      </button>
    )
  }

  // ── Nay button ───────────────────────────────────────────────────────────────

  const nayButton = (
    <button
      onClick={() => handle('nay')}
      disabled={isLoading || pickerOpen}
      aria-label="Nay — afvis"
      className={[
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        decision === 'nay'
          ? 'bg-red-500 text-white focus:ring-red-400'
          : decision === 'yay'
            ? 'bg-gray-100 text-gray-400 focus:ring-gray-300'
            : 'bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-400',
      ].join(' ')}
    >
      {loading === 'nay' ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <span aria-hidden>👎</span>
      )}
      Nay
    </button>
  )

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        {yayArea}
        {nayButton}
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
