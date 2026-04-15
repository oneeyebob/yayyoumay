'use client'

import { useState } from 'react'
import { changePassword, changePin } from './actions'

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

// ── Main export ───────────────────────────────────────────────────────────────

export default function AccountUI() {
  return (
    <div className="space-y-5">
      <ChangePasswordSection />
      <ChangePinSection />
    </div>
  )
}
