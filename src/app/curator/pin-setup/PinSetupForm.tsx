'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { savePinHash } from './actions'

function PinInput({
  id,
  value,
  onChange,
  onKeyDown,
  inputRef,
}: {
  id: string
  value: string
  onChange: (val: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <input
      id={id}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={value}
      onChange={(e) => {
        const val = e.target.value.replace(/\D/, '')
        onChange(val)
      }}
      onKeyDown={onKeyDown}
      className="w-12 h-14 text-center text-xl font-bold rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  )
}

function usePinState() {
  const [digits, setDigits] = useState(['', '', '', ''])
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  function handleChange(index: number, val: string) {
    const next = [...digits]
    next[index] = val
    setDigits(next)
    if (val && index < 3) {
      refs[index + 1].current?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  const pin = digits.join('')
  const complete = pin.length === 4

  function reset() {
    setDigits(['', '', '', ''])
    refs[0].current?.focus()
  }

  return { digits, refs, handleChange, handleKeyDown, pin, complete, reset }
}

export default function PinSetupForm() {
  const router = useRouter()
  const entry = usePinState()
  const confirm = usePinState()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!entry.complete || !confirm.complete) {
      setError('Udfyld begge PIN-felter.')
      return
    }

    if (entry.pin !== confirm.pin) {
      setError('PIN-koderne stemmer ikke overens. Prøv igen.')
      confirm.reset()
      return
    }

    setLoading(true)
    const { error: saveError } = await savePinHash(entry.pin)

    if (saveError) {
      setError(saveError)
      setLoading(false)
      return
    }

    router.push('/curator')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/yay-logo-compact.svg" alt="YAY!" className="h-10 w-auto" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vælg en kurator-PIN</h1>
        <p className="text-sm text-gray-500 mb-8">
          Du bruger denne 4-cifrede PIN til at få adgang til kuratormode.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Vælg PIN</p>
            <div className="flex gap-3">
              {entry.digits.map((digit, i) => (
                <PinInput
                  key={i}
                  id={`pin-entry-${i}`}
                  value={digit}
                  onChange={(val) => entry.handleChange(i, val)}
                  onKeyDown={(e) => entry.handleKeyDown(i, e)}
                  inputRef={entry.refs[i]}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Bekræft PIN</p>
            <div className="flex gap-3">
              {confirm.digits.map((digit, i) => (
                <PinInput
                  key={i}
                  id={`pin-confirm-${i}`}
                  value={digit}
                  onChange={(val) => confirm.handleChange(i, val)}
                  onKeyDown={(e) => confirm.handleKeyDown(i, e)}
                  inputRef={confirm.refs[i]}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !entry.complete || !confirm.complete}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Gemmer…' : 'Gem PIN'}
          </button>
        </form>
      </div>
    </main>
  )
}
