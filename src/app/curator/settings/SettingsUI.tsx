'use client'

import { useState } from 'react'
import { addKeyword, removeKeyword, changePassword, changePin } from './actions'

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
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        Indhold med disse ord i titlen vises ikke i Juniors feed.
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

// ── Change password section ───────────────────────────────────────────────────

function ChangePasswordSection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (next.length < 8) { setError('Ny adgangskode skal være mindst 8 tegn.'); return }
    if (next !== confirm) { setError('De to adgangskoder matcher ikke.'); return }
    setLoading(true)
    const { error: err } = await changePassword({ currentPassword: current, newPassword: next })
    setLoading(false)
    if (err) { setError(err); return }
    setSuccess(true)
    setCurrent(''); setNext(''); setConfirm('')
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="font-bold text-gray-900 mb-0.5">Skift adgangskode</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        Indtast din nuværende adgangskode og vælg en ny.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nuværende adgangskode</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Ny adgangskode</label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Bekræft ny adgangskode</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Adgangskode opdateret.</p>}
        <button
          type="submit"
          disabled={loading || !current || !next || !confirm}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Gemmer…' : 'Gem ny adgangskode'}
        </button>
      </form>
    </section>
  )
}

// ── Change PIN section ────────────────────────────────────────────────────────

function ChangePinSection() {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError('PIN skal være præcis 4 cifre.'); return }
    if (pin !== confirmPin) { setError('De to PIN-koder matcher ikke.'); return }
    setLoading(true)
    const { error: err } = await changePin(pin)
    setLoading(false)
    if (err) { setError(err); return }
    setSuccess(true)
    setPin(''); setConfirmPin('')
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="font-bold text-gray-900 mb-0.5">Skift kurator-PIN</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        Vælg en ny 4-cifret PIN til kuratormode.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Ny PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Bekræft ny PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">PIN opdateret.</p>}
        <button
          type="submit"
          disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Gemmer…' : 'Gem ny PIN'}
        </button>
      </form>
    </section>
  )
}

// ── Ads info section ─────────────────────────────────────────────────────────

function AdsInfoSection() {
  return (
    <section className="bg-blue-50 rounded-xl border border-blue-100 p-5">
      <h2 className="font-bold text-gray-900 mb-1">Reklamer i videofeed</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-3">
        YAY! kan ikke fjerne reklamer. Hvis du vil se videoer uden reklamer, kan du tegne et YouTube
        Premium abonnement. Når du er logget ind på YouTube i denne browser med Premium, vises
        videoer uden annoncer — også i YAY!
      </p>
      <a
        href="https://www.youtube.com/premium"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
      >
        Læs mere om YouTube Premium →
      </a>
    </section>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SettingsUI({
  initialKeywords,
}: {
  initialKeywords: KeywordRow[]
}) {
  return (
    <div className="space-y-5">
      <KeywordBlacklistSection initialKeywords={initialKeywords} />
      <ChangePasswordSection />
      <ChangePinSection />
      <AdsInfoSection />
    </div>
  )
}
