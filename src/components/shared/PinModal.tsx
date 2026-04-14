'use client'

import { useEffect, useRef, useState } from 'react'
import { verifyPin } from '@/app/curator/verify-pin/actions'

// ---------------------------------------------------------------------------
// Single digit input
// ---------------------------------------------------------------------------
function DigitInput({
  value,
  onChange,
  onKeyDown,
  inputRef,
  autoFocus,
}: {
  value: string
  onChange: (val: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  autoFocus?: boolean
}) {
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value.replace(/\D/, ''))}
      onKeyDown={onKeyDown}
      className="w-12 h-14 text-center text-xl font-bold rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  )
}

// ---------------------------------------------------------------------------
// PinModal
// ---------------------------------------------------------------------------
interface PinModalProps {
  isOpen: boolean
  onSuccess: () => void
  onClose?: () => void
}

export default function PinModal({ isOpen, onSuccess, onClose }: PinModalProps) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', ''])
      setError(null)
      setLoading(false)
      setTimeout(() => refs[0].current?.focus(), 50)
    }
  }, [isOpen])

  function handleChange(index: number, val: string) {
    const next = [...digits]
    next[index] = val
    setDigits(next)
    if (val && index < 3) {
      refs[index + 1].current?.focus()
    }
    // Auto-submit when last digit is filled
    if (val && index === 3) {
      const pin = [...next].join('')
      if (pin.length === 4) submit(pin)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  function reset() {
    setDigits(['', '', '', ''])
    setTimeout(() => refs[0].current?.focus(), 50)
  }

  async function submit(pin: string) {
    setError(null)
    setLoading(true)

    const { error: verifyError } = await verifyPin(pin)

    if (verifyError) {
      setError(verifyError)
      setLoading(false)
      reset()
      return
    }

    onSuccess()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Curator PIN"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-white"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-xs bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-1 text-center">Kurator-adgang</h2>
        <p className="text-sm text-gray-500 text-center mb-6">Indtast din 4-cifrede PIN</p>

        <div className="flex justify-center gap-3 mb-6">
          {digits.map((digit, i) => (
            <DigitInput
              key={i}
              value={digit}
              autoFocus={i === 0}
              onChange={(val) => handleChange(i, val)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputRef={refs[i]}
            />
          ))}
        </div>

        {loading && (
          <p className="text-sm text-gray-400 text-center">Tjekker…</p>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}

        <p className="text-center mt-4">
          <a
            href="/curator/reset-pin"
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline transition-colors"
          >
            Glemt PIN?
          </a>
        </p>

        {onClose && (
          <button
            onClick={onClose}
            className="mt-5 w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Annuller
          </button>
        )}
      </div>
    </div>
  )
}
