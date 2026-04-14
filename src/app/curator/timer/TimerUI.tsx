'use client'

import { useState, useEffect } from 'react'
import { setTimer, cancelTimer, setPause, cancelPause, updatePauseVideoUrl, updatePauseDurationMinutes } from './actions'

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

export interface PauseRow {
  profileId: string
  blockedUntil: string
}

interface Props {
  profiles: ProfileRow[]
  activeTimers: TimerRow[]
  activePauses: PauseRow[]
  pauseVideoUrl: string
  pauseDurationMinutes: number
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
  return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

type DurationUnit = 'minutter' | 'timer'
type TimerMode = 'varighed' | 'tidspunkt'

// ── Section 1: Skærmtid ───────────────────────────────────────────────────────

function ScreenTimeSection({
  profiles,
  activeTimers: initialTimers,
  pauseDurationMinutes,
}: {
  profiles: ProfileRow[]
  activeTimers: TimerRow[]
  pauseDurationMinutes: number
}) {
  const [timers, setTimers] = useState<TimerRow[]>(initialTimers)
  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.id ?? '')
  const [allProfiles, setAllProfiles] = useState(false)
  const [mode, setMode] = useState<TimerMode>('varighed')
  const [durationValue, setDurationValue] = useState('45')
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('minutter')
  const [expiresAtTime, setExpiresAtTime] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [autoCancelTime, setAutoCancelTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetIds = allProfiles ? profiles.map((p) => p.id) : [selectedProfileId]
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId)
  const activeTimer = allProfiles ? null : timers.find((t) => t.profileId === selectedProfileId)

  async function handleStart() {
    if (targetIds.length === 0) return
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

    if (autoCancelAt && autoCancelAt.getTime() <= expiresAt.getTime()) {
      setError('Automatisk sletning skal ligge efter timerens udløb.')
      setLoading(false)
      return
    }

    const results = await Promise.all(
      targetIds.map((id) => setTimer(id, expiresAt.toISOString(), autoCancelAt?.toISOString() ?? null))
    )
    setLoading(false)
    const firstErr = results.find((r) => r.error)?.error
    if (firstErr) { setError(firstErr); return }

    setTimers((prev) => [
      ...prev.filter((t) => !targetIds.includes(t.profileId)),
      ...targetIds.map((id) => ({ id: crypto.randomUUID(), profileId: id, expiresAt: expiresAt.toISOString(), autoCancelAt: autoCancelAt?.toISOString() ?? null, pauseDurationMinutes, isActive: true })),
    ])
  }

  async function handleCancel() {
    const { error: err } = await cancelTimer(selectedProfileId)
    if (!err) setTimers((prev) => prev.filter((t) => t.profileId !== selectedProfileId))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-gray-900 text-lg">Sæt Timer</h2>

      {/* Profile */}
      {allProfiles ? (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">
          Alle profiler
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Profil</label>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* All profiles checkbox */}
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allProfiles}
          onChange={(e) => setAllProfiles(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">Gælder alle profiler</span>
      </label>

      {/* Active timer display — always visible (hidden when allProfiles) */}
      {!allProfiles && <ActiveTimerDisplay timer={activeTimer ?? null} onCancel={handleCancel} />}

      {/* Form */}
      <>
          <p className="text-sm text-gray-600">Hvor længe må {allProfiles ? 'alle' : selectedProfile?.name} se?</p>

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
                {m === 'varighed' ? 'Minutter' : 'Indtil kl.'}
              </button>
            ))}
          </div>

          {mode === 'varighed' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {durationUnit === 'minutter' ? 'Antal minutter' : 'Antal timer'}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="45"
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tidspunkt</label>
              <input
                type="time"
                value={expiresAtTime}
                onChange={(e) => setExpiresAtTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timer slettes automatisk kl. <span className="text-gray-400 font-normal">(valgfri)</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">Timeren annulleres på dette tidspunkt, selv om tiden ikke er brugt op.</p>
            <input
              type="time"
              value={autoCancelTime}
              onChange={(e) => setAutoCancelTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleStart}
            disabled={loading || !selectedProfileId}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                Starter…
              </span>
            ) : allProfiles ? 'Start skærmtid for alle' : `Start skærmtid for ${selectedProfile?.name ?? ''}`}
          </button>
      </>
    </section>
  )
}

function ActiveTimerDisplay({ timer, onCancel }: { timer: TimerRow | null; onCancel: () => void }) {
  const [msLeft, setMsLeft] = useState(() => timer ? new Date(timer.expiresAt).getTime() - Date.now() : 0)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!timer) { setMsLeft(0); return }
    setMsLeft(new Date(timer.expiresAt).getTime() - Date.now())
    const id = setInterval(() => setMsLeft(new Date(timer.expiresAt).getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [timer?.expiresAt])

  if (!timer) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-0.5">Ingen aktiv timer</p>
          <p className="text-2xl font-bold tabular-nums text-gray-300">–:––:––</p>
        </div>
        <button disabled className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-300 cursor-not-allowed">
          Annuller
        </button>
      </div>
    )
  }

  const expired = msLeft <= 0

  return (
    <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-xs text-blue-600 font-medium mb-0.5">Aktiv timer</p>
        <p className={['text-2xl font-bold tabular-nums', expired ? 'text-red-500' : 'text-blue-900'].join(' ')}>
          {expired ? 'Udløbet' : formatCountdown(msLeft)}
        </p>
        <p className="text-xs text-blue-500 mt-0.5">Slutter kl. {formatTime(timer.expiresAt)}</p>
        {timer.autoCancelAt && (
          <p className="text-xs text-blue-500">Slettes kl. {formatTime(timer.autoCancelAt)}</p>
        )}
      </div>
      <button
        onClick={async () => { setCancelling(true); await onCancel(); setCancelling(false) }}
        disabled={cancelling}
        className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition-colors"
      >
        {cancelling ? 'Annullerer…' : 'Annuller'}
      </button>
    </div>
  )
}

// ── Section 2: Pause ──────────────────────────────────────────────────────────

function PauseSection({
  profiles,
  activePauses: initialPauses,
}: {
  profiles: ProfileRow[]
  activePauses: PauseRow[]
}) {
  const [pauses, setPauses] = useState<PauseRow[]>(initialPauses)
  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.id ?? '')
  const [allProfiles, setAllProfiles] = useState(false)
  const [blockedUntilTime, setBlockedUntilTime] = useState(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId)

  // Which profile IDs are affected
  const targetIds = allProfiles ? profiles.map((p) => p.id) : [selectedProfileId]

  // Active pauses for the current selection
  const activePausesForTarget = pauses.filter((p) => targetIds.includes(p.profileId))
  const hasActivePause = allProfiles
    ? activePausesForTarget.length === profiles.length
    : activePausesForTarget.length > 0

  async function handleSetPause() {
    setError(null)
    setLoading(true)

    const [h, m] = blockedUntilTime.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)

    const { error: err } = await setPause(targetIds, d.toISOString())
    setLoading(false)
    if (err) { setError(err); return }

    setPauses((prev) => [
      ...prev.filter((p) => !targetIds.includes(p.profileId)),
      ...targetIds.map((id) => ({ profileId: id, blockedUntil: d.toISOString() })),
    ])
  }

  async function handleCancelPause() {
    const { error: err } = await cancelPause(targetIds)
    if (!err) setPauses((prev) => prev.filter((p) => !targetIds.includes(p.profileId)))
  }

  const buttonLabel = 'Sæt pause'

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-gray-900 text-lg">Sæt YAY! på pause</h2>

      {/* Profile dropdown — hidden when allProfiles */}
      {allProfiles ? (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">
          Alle profiler
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Profil</label>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* All profiles checkbox */}
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allProfiles}
          onChange={(e) => setAllProfiles(e.target.checked)}
          className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
        />
        <span className="text-sm text-gray-700">Gælder alle profiler</span>
      </label>

      {/* Active pause display — always visible */}
      {/* NOTE: Pause for alle profiler stopper adgang uanset om en aktiv timer kører. Det er intentionelt —
          pause er en øjeblikkelig spærring, der træder i kraft over timeren. Frosne timers genoptages
          automatisk når pausen annulleres. */}
      <ActivePauseDisplay
        pause={hasActivePause ? activePausesForTarget[0] : null}
        label={allProfiles ? 'Alle profiler blokeret' : undefined}
        onCancel={handleCancelPause}
      />

      {/* Form */}
      <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">På pause indtil kl.</label>
            <input
              type="time"
              value={blockedUntilTime}
              onChange={(e) => setBlockedUntilTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSetPause}
            disabled={loading || targetIds.length === 0}
            className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                Sætter pause…
              </span>
            ) : buttonLabel}
          </button>
      </>
    </section>
  )
}

function ActivePauseDisplay({ pause, label, onCancel }: { pause: PauseRow | null; label?: string; onCancel: () => void }) {
  const [cancelling, setCancelling] = useState(false)

  if (!pause) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-0.5">Ingen aktiv pause</p>
          <p className="text-lg font-bold text-gray-300">På pause til kl. ––:––</p>
        </div>
        <button disabled className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-300 cursor-not-allowed">
          Annuller
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-xs text-orange-600 font-medium mb-0.5">{label ?? 'Aktiv pause'}</p>
        <p className="text-lg font-bold text-orange-900">På pause til kl. {formatTime(pause.blockedUntil)}</p>
      </div>
      <button
        onClick={async () => { setCancelling(true); await onCancel(); setCancelling(false) }}
        disabled={cancelling}
        className="shrink-0 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50 transition-colors"
      >
        {cancelling ? 'Annullerer…' : 'Annuller'}
      </button>
    </div>
  )
}

// ── Admin settings section ────────────────────────────────────────────────────

function AdminSettingsSection({ initialUrl, initialPauseDuration }: { initialUrl: string; initialPauseDuration: number }) {
  const [url, setUrl] = useState(initialUrl)
  const [pauseDuration, setPauseDuration] = useState(String(initialPauseDuration))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true); setSaved(false); setError(null)
    const [urlResult, durationResult] = await Promise.all([
      updatePauseVideoUrl(url),
      updatePauseDurationMinutes(parseInt(pauseDuration, 10)),
    ])
    setSaving(false)
    const err = urlResult.error ?? durationResult.error
    if (err) setError(err)
    else setSaved(true)
  }

  return (
    <section className="bg-blue-50 rounded-xl border border-blue-100 p-5 space-y-4">
      <h2 className="font-bold text-gray-900">Admin-indstillinger</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pause-video URL</label>
        <p className="text-xs text-gray-500 mb-2">YouTube-video der vises under en pause.</p>
        <input type="url" value={url} onChange={(e) => { setUrl(e.target.value); setSaved(false) }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pauselængde</label>
        <select value={pauseDuration} onChange={(e) => { setPauseDuration(e.target.value); setSaved(false) }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {[5, 10, 15, 30].map((n) => <option key={n} value={n}>{n} minutter</option>)}
        </select>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {saving ? 'Gemmer…' : 'Gem'}
      </button>
      {saved && <p className="text-xs text-green-600">Gemt.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TimerUI({ profiles, activeTimers, activePauses, pauseVideoUrl, pauseDurationMinutes, isSuperAdmin }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Skærmtid</h1>

      {profiles.length === 0 ? (
        <p className="text-sm text-gray-500">Ingen profiler fundet.</p>
      ) : (
        <>
          <ScreenTimeSection profiles={profiles} activeTimers={activeTimers} pauseDurationMinutes={pauseDurationMinutes} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-gray-200" />
            </div>
          </div>

          <PauseSection profiles={profiles} activePauses={activePauses} />
        </>
      )}

      {isSuperAdmin && <AdminSettingsSection initialUrl={pauseVideoUrl} initialPauseDuration={pauseDurationMinutes} />}
    </div>
  )
}
