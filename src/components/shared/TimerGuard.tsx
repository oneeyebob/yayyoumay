'use client'

import { useState, useEffect, useCallback } from 'react'
import PinModal from './PinModal'
import { unlockTimer } from '@/app/(junior)/timer-actions'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimerStatus {
  timerExpired: boolean
  isPaused: boolean
  secondsRemaining: number
  pauseUntil: string | null
  pauseVideoUrl: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getYouTubeEmbedUrl(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  )
  if (!match) return ''
  const videoId = match[1]
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&rel=0&controls=0&modestbranding=1`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TimerGuard({ profileId }: { profileId: string }) {
  const [status, setStatus] = useState<TimerStatus | null>(null)
  const [localSecondsRemaining, setLocalSecondsRemaining] = useState(0)
  const [pinOpen, setPinOpen] = useState(false)

  // ── DB polling every 10s ───────────────────────────────────────────────────

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/timer-status?profileId=${encodeURIComponent(profileId)}`)
      if (res.ok) {
        const data: TimerStatus = await res.json()
        setStatus(data)
        setLocalSecondsRemaining(data.secondsRemaining)
      }
    } catch {
      // Network error — keep showing last known state
    }
  }, [profileId])

  useEffect(() => {
    poll()
    const id = setInterval(poll, 10_000)
    return () => clearInterval(id)
  }, [poll])

  // ── Local 1s countdown ────────────────────────────────────────────────────

  useEffect(() => {
    if (localSecondsRemaining <= 0) return
    const id = setInterval(() => {
      setLocalSecondsRemaining((s) => Math.max(0, s - 1))
    }, 1_000)
    return () => clearInterval(id)
  }, [localSecondsRemaining])

  // ── Unlock via PIN ────────────────────────────────────────────────────────

  async function handleUnlock() {
    const { error } = await unlockTimer(profileId)
    if (!error) {
      setPinOpen(false)
      await poll()
    }
  }

  if (!status) return null

  const isBlockedByDB = status.timerExpired || status.isPaused
  const isBlockedLocally = localSecondsRemaining <= 0 && status.secondsRemaining > 0
  const isBlocked = isBlockedByDB || isBlockedLocally
  const isCountdown = !isBlocked && localSecondsRemaining > 0 && localSecondsRemaining <= 30

  if (!isBlocked && !isCountdown) return null

  // ── Countdown warning (non-blocking toast) ─────────────────────────────────

  if (isCountdown) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <div className="bg-orange-500 text-white rounded-2xl px-6 py-3 shadow-xl text-center">
          <p className="text-xs font-medium opacity-80 mb-0.5">Skærmtid slutter snart</p>
          <p className="text-4xl font-bold tabular-nums leading-none">{localSecondsRemaining}s</p>
        </div>
      </div>
    )
  }

  // ── Blocking overlay ───────────────────────────────────────────────────────

  const embedUrl = status.pauseVideoUrl ? getYouTubeEmbedUrl(status.pauseVideoUrl) : ''

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white overflow-hidden">
        {/* Pause video fullscreen background */}
        {embedUrl && (
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Pause-video"
          />
        )}

        {/* Overlay content on top of video */}
        <div
          className="relative z-10 flex flex-col items-center gap-3 p-8 rounded-2xl text-center"
          style={{ background: embedUrl ? 'rgba(255,255,255,0.85)' : 'transparent' }}
        >
          <img src="/yay-logo-compact.svg" alt="YAY!" className="h-14 w-auto" />
          <p className="text-2xl font-bold text-gray-900">YAY! holder pause</p>
          {status.isPaused && status.pauseUntil && (
            <p className="text-sm text-gray-500">
              Fortsætter kl. {formatTime(status.pauseUntil)}
            </p>
          )}
          {!status.isPaused && (
            <p className="text-sm text-gray-500">Skærmtiden er slut</p>
          )}
          <button
            onClick={() => setPinOpen(true)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
          >
            Kurator-adgang
          </button>
        </div>
      </div>

      <PinModal isOpen={pinOpen} onSuccess={handleUnlock} onClose={() => setPinOpen(false)} />
    </>
  )
}
