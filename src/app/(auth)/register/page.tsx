'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerUser } from './actions'

// Format a 32-char key as 8 groups of 4 for readability: XXXX XXXX XXXX …
function formatKey(key: string): string {
  return key.match(/.{1,4}/g)?.join(' ') ?? key
}

// ── Hotkey screen ─────────────────────────────────────────────────────────────

function HotkeyScreen({ hotkey, onConfirm }: { hotkey: string; onConfirm: () => void }) {
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(hotkey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full max-w-md">
      {/* Warning header */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6">
        <span className="text-xl mt-0.5" aria-hidden>⚠️</span>
        <div>
          <p className="font-bold text-amber-900 text-sm">Gem din nøgle nu</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Denne nøgle vises kun én gang og kan ikke genskabes. Den er din eneste måde at gendanne kontoen på, hvis du glemmer din adgangskode.
          </p>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Din gendannelsesnøgle</h1>
      <p className="text-sm text-gray-500 mb-6">Gem den i en password manager, et fysisk sted — et sted sikkert.</p>

      {/* Key display */}
      <div className="bg-gray-900 rounded-xl p-5 mb-3 relative">
        <p className="font-mono text-lg font-bold text-white tracking-widest text-center leading-relaxed select-all">
          {formatKey(hotkey)}
        </p>
      </div>

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className={[
          'w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors mb-6',
          copied
            ? 'bg-green-100 text-green-700 border border-green-300'
            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
        ].join(' ')}
      >
        {copied ? '✓ Kopieret!' : 'Kopiér nøgle'}
      </button>

      {/* Confirmation checkbox */}
      <label className="flex items-start gap-3 cursor-pointer mb-6">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <span className="text-sm text-gray-700">
          Jeg har gemt min nøgle på et sikkert sted
        </span>
      </label>

      {/* Proceed button */}
      <button
        type="button"
        disabled={!confirmed}
        onClick={onConfirm}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Fortsæt til opsætning
      </button>
    </div>
  )
}

// ── Registration form ─────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()

  const [screen, setScreen] = useState<'form' | 'hotkey'>('form')
  const [hotkey, setHotkey] = useState('')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Adgangskoderne stemmer ikke overens.')
      return
    }

    if (password.length < 8) {
      setError('Adgangskoden skal være mindst 8 tegn.')
      return
    }

    setLoading(true)

    // Generate a 32-character recovery key client-side
    const generatedKey = crypto.randomUUID().replace(/-/g, '').toUpperCase()

    const { error: regError } = await registerUser({
      username,
      password,
      hotkey: generatedKey,
    })

    if (regError) {
      setError(regError)
      setLoading(false)
      return
    }

    // Move to the hotkey display screen before navigating away
    setHotkey(generatedKey)
    setLoading(false)
    setScreen('hotkey')
  }

  if (screen === 'hotkey') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <HotkeyScreen
          hotkey={hotkey}
          onConfirm={() => router.push('/curator/profiles')}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Opret konto</h1>
        <p className="text-sm text-gray-500 mb-8">Sæt din husstandskuratorprofil op.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Brugernavn
            </label>
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="f.eks. jakob"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Kun du ser dette navn. Ingen e-mail gemmes.
            </p>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Adgangskode
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Min. 8 tegn"
            />
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              Gentag adgangskode
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Gentag adgangskoden"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Opretter konto…' : 'Opret konto'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Har du allerede en konto?{' '}
            <a href="/login" className="text-blue-600 hover:underline font-medium">
              Log ind
            </a>
          </p>
        </form>
      </div>
    </main>
  )
}
