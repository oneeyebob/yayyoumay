'use client'

import { useState } from 'react'
import { addKeyword, removeKeyword, setYoutubePremium } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KeywordRow {
  id: string
  keyword: string
}

// ── Keyword blacklist section ─────────────────────────────────────────────────

function KeywordBlacklistSection({ initialKeywords }: { initialKeywords: KeywordRow[] }) {
  const [keywords, setKeywords] = useState<KeywordRow[]>(initialKeywords)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleAdd() {
    const trimmed = input.trim()
    if (!trimmed) return
    setAdding(true)
    setAddError(null)
    const { error, id } = await addKeyword(trimmed)
    setAdding(false)
    if (error) { setAddError(error); return }
    setKeywords((prev) => [...prev, { id: id!, keyword: trimmed.toLowerCase() }])
    setInput('')
  }

  async function handleRemove(id: string) {
    setRemovingId(id)
    const { error } = await removeKeyword(id)
    setRemovingId(null)
    if (!error) setKeywords((prev) => prev.filter((k) => k.id !== id))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="font-bold text-gray-900 mb-0.5">Ordfilter</h2>
      <p className="text-xs text-gray-400 mb-4">
        Indhold med disse ord i titlen skjules automatisk i alle søgeresultater.
      </p>

      {/* Input row */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder="fx. skræmmende, vold…"
          disabled={adding}
          className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !input.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {adding ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
          ) : 'Tilføj'}
        </button>
      </div>

      {addError && <p className="text-xs text-red-500 mb-3">{addError}</p>}

      {keywords.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Ingen filtrerede ord.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <span
              key={kw.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 pl-3 pr-2 py-1 text-sm font-medium text-gray-700"
            >
              {kw.keyword}
              <button
                onClick={() => handleRemove(kw.id)}
                disabled={removingId === kw.id}
                aria-label={`Fjern '${kw.keyword}'`}
                className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                {removingId === kw.id ? (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" aria-hidden />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3" aria-hidden>
                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                  </svg>
                )}
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

// ── YouTube Premium section ───────────────────────────────────────────────────

function YoutubePremiumSection({ initialValue }: { initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)

  async function handleToggle() {
    const next = !enabled
    setEnabled(next)
    setSaving(true)
    const { error } = await setYoutubePremium(next)
    setSaving(false)
    if (error) {
      // revert on error
      setEnabled(!next)
    } else {
      setFlash(true)
      setTimeout(() => setFlash(false), 1500)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="font-bold text-gray-900 mb-4">YouTube Premium</h2>

      <label className="flex items-center justify-between gap-4 cursor-pointer select-none">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">Jeg har YouTube Premium</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Slår annoncer fra via dit eget abonnement
          </p>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          disabled={saving}
          className={[
            'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            enabled ? 'bg-blue-600' : 'bg-gray-200',
          ].join(' ')}
        >
          <span
            className={[
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0',
              'transition-transform duration-200 ease-in-out',
              enabled ? 'translate-x-5' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </label>

      {/* Saved flash */}
      {flash && (
        <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5" aria-hidden>
            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
          </svg>
          Gemt
        </p>
      )}
    </section>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SettingsUI({
  initialKeywords,
  youtubePremium,
}: {
  initialKeywords: KeywordRow[]
  youtubePremium: boolean
}) {
  return (
    <div className="space-y-5">
      <KeywordBlacklistSection initialKeywords={initialKeywords} />
      <YoutubePremiumSection initialValue={youtubePremium} />
    </div>
  )
}
