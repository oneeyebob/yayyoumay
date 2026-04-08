'use client'

import { useState } from 'react'
import { recoverAccount } from './actions'

// Format raw input as XXXX XXXX … groups for display
function formatDisplay(raw: string): string {
  const cleaned = raw.replace(/\s+/g, '').slice(0, 32)
  return cleaned.match(/.{1,4}/g)?.join(' ') ?? cleaned
}

export default function RecoverPage() {
  const [raw, setRaw] = useState('') // always clean (no spaces, uppercase)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cleaned = e.target.value.replace(/\s+/g, '').toUpperCase().slice(0, 32)
    setRaw(cleaned)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await recoverAccount(raw)
    // recoverAccount redirects on success — we only reach here on error
    setError(result.error)
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/yay-logo-compact.svg" alt="YAY!" className="h-12 w-auto" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Gendannelse af konto</h1>
        <p className="text-sm text-gray-500 mb-8">
          Indtast din 32-tegns nøgle for at nulstille din adgangskode.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="hotkey" className="block text-sm font-medium text-gray-700 mb-1">
              Gendannelsesnøgle
            </label>
            <input
              id="hotkey"
              type="text"
              required
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={formatDisplay(raw)}
              onChange={handleChange}
              placeholder="XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono tracking-widest"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              {raw.length} / 32 tegn
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || raw.length !== 32}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verificerer…' : 'Bekræft nøgle'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Husker du din adgangskode?{' '}
            <a href="/login" className="text-blue-600 hover:underline font-medium">
              Log ind
            </a>
          </p>
        </form>
      </div>
    </main>
  )
}
