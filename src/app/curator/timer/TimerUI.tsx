'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { setTimer, cancelTimer, updatePauseVideoUrl } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string
  name: string
}

export interface TimerRow {
  id: string
  profileId: string
  expiresAt: string
  autoCancelAt: string | null
  pauseDurationMinutes: number
  isActive: boolean
}

interface Props {
  profiles: ProfileRow[]
  activeTimers: TimerRow[]
  pauseVideoUrl: string
  isSuperAdmin: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

// ── Active timer card ─────────────────────────────────────────────────────────

function ActiveTimerCard({
  timer,
  profileName,
  onCancelled,
}: {
  timer: TimerRow
  profileName: string
  onCancelled: (profileId: string) => void
}) {
  const [msLeft, setMsLeft] = useState(() => new Date(timer.expiresAt).getTime() - Date.now())
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setMsLeft(new Date(timer.expiresAt).getTime() - Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [timer.expiresAt])

  async function handleCancel() {
    setCancelling(true)
    const { error } = await cancelTimer(timer.profileId)
    if (!error) onCancelled(timer.profileId)
    else setCancelling(false)
  }

  const expired = msLeft <= 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900 mb-0.5">{profileName}</p>
          <p className={['text-3xl font-bold tabular-nums', expired ? 'text-red-500' : 'text-gray-900'].join(' ')}>
            {expired ? 'Udløbet' : formatCountdown(msLeft)}
          </p>
          {timer.autoCancelAt && (
            <p className="text-xs text-gray-400 mt-1">
              Auto-annullering kl. {formatTime(timer.autoCancelAt)}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            Pause: {timer.pauseDurationMinutes} min
          </p>
        </div>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {cancelling ? 'Annullerer…' : 'Annuller'}
        </button>
      </div>
    </div>
  )
}

// ── Set timer form ─────────────────────────────────────────────────────────────

type DurationUnit = 'minutter' | 'timer'
type TimerMode = 'varighed' | 'tidspunkt'

function SetTimerForm({
  profiles,
  onTimerSet,
}: {
  profiles: ProfileRow[]
  onTimerSet: (timer: TimerRow) => void
}) {
  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.id ?? '')
  const [mode, setMode] = useState<TimerMode>('varighed')
  const [durationValue, setDurationValue] = useState('60')
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('minutter')
  const [expiresAtTime, setExpiresAtTime] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [pauseDuration, setPauseDuration] = useState('10')
  const [autoCancelTime, setAutoCancelTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!selectedProfileId) return
    setError(null)
    setLoading(true)

    let expiresAt: Date
    if (mode === 'varighed') {
      const val = parseInt(durationValue, 10)
      if (!val || val <= 0) { setError('Ugyldig varighed.'); setLoading(false); return }
      const ms = durationUnit === 'timer' ? val * 3600 * 1000 : val * 60 * 1000
      expiresAt = new Date(Date.now() + ms)
    } else {
      const [h, m] = expiresAtTime.split(':').map(Number)
      const d = new Date()
      d.setHours(h, m, 0, 0)
      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
      expiresAt = d
    }

    let autoCancelAt: Date | null = null
    if (autoCancelTime) {
      const [h, m] = autoCancelTime.split(':').map(Number)
      const d = new Date()
      d.setHours(h, m, 0, 0)
      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
      autoCancelAt = d
    }

    const { error: err } = await setTimer(
      selectedProfileId,
      expiresAt.toISOString(),
      autoCancelAt?.toISOString() ?? null,
      parseInt(pauseDuration, 10)
    )

    setLoading(false)
    if (err) { setError(err); return }

    onTimerSet({
      id: crypto.randomUUID(),
      profileId: selectedProfileId,
      expiresAt: expiresAt.toISOString(),
      autoCancelAt: autoCancelAt?.toISOString() ?? null,
      pauseDurationMinutes: parseInt(pauseDuration, 10),
      isActive: true,
    })
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-gray-900">Sæt timer</h2>

      {/* Profile */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Profil</label>
        <select
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {(['varighed', 'tidspunkt'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={[
              'flex-1 py-2 text-sm font-medium transition-colors',
              mode === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {m === 'varighed' ? 'Varighed' : 'Udløber kl.'}
          </button>
        ))}
      </div>

      {/* Duration or time input */}
      {mode === 'varighed' ? (
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={durationValue}
            onChange={(e) => setDurationValue(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={durationUnit}
            onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="minutter">minutter</option>
            <option value="timer">timer</option>
          </select>
        </div>
      ) : (
        <input
          type="time"
          value={expiresAtTime}
          onChange={(e) => setExpiresAtTime(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {/* Pause duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pauselængde</label>
        <select
          value={pauseDuration}
          onChange={(e) => setPauseDuration(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[5, 10, 15, 30].map((n) => (
            <option key={n} value={n}>{n} minutter</option>
          ))}
        </select>
      </div>

      {/* Auto-cancel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Automatisk annullering kl. <span className="text-gray-400 font-normal">(valgfri)</span>
        </label>
        <input
          type="time"
          value={autoCancelTime}
          onChange={(e) => setAutoCancelTime(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || !selectedProfileId}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
            Starter…
          </span>
        ) : 'Start timer'}
      </button>
    </section>
  )
}

// ── Pause video URL section (super_admin only) ────────────────────────────────

function PauseVideoSection({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    const { error: err } = await updatePauseVideoUrl(url)
    setSaving(false)
    if (err) setError(err)
    else setSaved(true)
  }

  return (
    <section className="bg-blue-50 rounded-xl border border-blue-100 p-5">
      <h2 className="font-bold text-gray-900 mb-1">Pause-video URL</h2>
      <p className="text-sm text-gray-600 mb-3">YouTube-video der vises under en pause.</p>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setSaved(false) }}
          className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Gemmer…' : 'Gem'}
        </button>
      </div>
      {saved && <p className="text-xs text-green-600 mt-2">Gemt.</p>}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </section>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TimerUI({ profiles, activeTimers: initialTimers, pauseVideoUrl, isSuperAdmin }: Props) {
  const [timers, setTimers] = useState<TimerRow[]>(initialTimers)

  const handleCancelled = useCallback((profileId: string) => {
    setTimers((prev) => prev.filter((t) => t.profileId !== profileId))
  }, [])

  const handleTimerSet = useCallback((timer: TimerRow) => {
    setTimers((prev) => [...prev.filter((t) => t.profileId !== timer.profileId), timer])
  }, [])

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.name]))

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/curator"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
        </svg>
        Kuratormode
      </Link>

      <h1 className="text-xl font-bold text-gray-900">Skærmtimer</h1>

      {/* Active timers */}
      {timers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Aktive timere</h2>
          {timers.map((t) => (
            <ActiveTimerCard
              key={t.id}
              timer={t}
              profileName={profileMap[t.profileId] ?? '—'}
              onCancelled={handleCancelled}
            />
          ))}
        </div>
      )}

      {/* Set timer */}
      {profiles.length > 0 ? (
        <SetTimerForm profiles={profiles} onTimerSet={handleTimerSet} />
      ) : (
        <p className="text-sm text-gray-500">Ingen profiler fundet.</p>
      )}

      {/* Super admin: pause video URL */}
      {isSuperAdmin && <PauseVideoSection initialUrl={pauseVideoUrl} />}
    </div>
  )
}
