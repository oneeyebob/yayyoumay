'use client'

import { useState, useTransition } from 'react'
import { addFromUrl } from './actions'

interface Props {
  listId: string
}

export default function PasteUrlUI({ listId }: Props) {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    setResult(null)
    startTransition(async () => {
      const res = await addFromUrl(trimmed, listId)
      if (res.error) {
        setResult({ ok: false, message: res.error })
      } else {
        setResult({ ok: true, message: `Tilføjet! ${res.title ?? ''}`.trim() })
        setUrl('')
        window.location.reload()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setResult(null) }}
          placeholder="Indsæt YouTube URL..."
          className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
        />
        <button
          type="submit"
          disabled={isPending || !url.trim()}
          className="shrink-0 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
          ) : 'Tilføj'}
        </button>
      </div>
      {result && (
        <p className={`text-xs font-medium ${result.ok ? 'text-green-600' : 'text-red-500'}`}>
          {result.message}
        </p>
      )}
    </form>
  )
}
