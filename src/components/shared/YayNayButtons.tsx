'use client'

import { useState } from 'react'
import { yayNayAction, type YayNayParams } from '@/app/curator/actions'

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

  async function handle(status: 'yay' | 'nay') {
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
      // No listId — action reads active_profile_id cookie server-side
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

  // ── Yay button ────────────────────────────────────────────────────────────────

  const yayButton = (
    <button
      onClick={() => handle('yay')}
      disabled={isLoading}
      aria-label="Yay — godkend"
      className={[
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all',
        'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        decision === 'yay'
          ? 'bg-green-500 text-white cursor-default'
          : decision === 'nay'
            ? 'bg-gray-100 text-gray-400'
            : 'bg-green-50 text-green-700 hover:bg-green-100',
      ].join(' ')}
    >
      {loading === 'yay' ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <span aria-hidden>👍</span>
      )}
      Yay
    </button>
  )

  // ── Nay button ────────────────────────────────────────────────────────────────

  const nayButton = (
    <button
      onClick={() => handle('nay')}
      disabled={isLoading}
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
      <div className="flex items-center gap-2">
        {yayButton}
        {nayButton}
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
