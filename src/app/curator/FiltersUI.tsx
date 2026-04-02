'use client'

import { useState, useTransition } from 'react'
import { updateListFilters } from './actions'

const LANG_OPTIONS = [
  { value: 'da', label: 'Dansk' },
  { value: 'en', label: 'Engelsk' },
  { value: 'et', label: 'Estisk' },
  { value: 'fo', label: 'Færøsk' },
  { value: 'fi', label: 'Finsk' },
  { value: 'kl', label: 'Grønlandsk' },
  { value: 'is', label: 'Islandsk' },
  { value: 'lv', label: 'Lettisk' },
  { value: 'lt', label: 'Litauisk' },
  { value: 'no', label: 'Norsk' },
  { value: 'pl', label: 'Polsk' },
  { value: 'sv', label: 'Svensk' },
  { value: 'de', label: 'Tysk' },
]

const AGE_OPTIONS = [
  { value: '4-6', label: '4–6 år' },
  { value: '7-9', label: '7–9 år' },
  { value: '10-12', label: '10–12 år' },
]

interface Props {
  listId: string
  initialLangFilter: string | null
  initialAgeFilter: string | null
}

export default function FiltersUI({ listId, initialLangFilter, initialAgeFilter }: Props) {
  const [langs, setLangs] = useState<string[]>(
    initialLangFilter ? initialLangFilter.split(',').map((s) => s.trim()).filter(Boolean) : []
  )
  const [ages, setAges] = useState<string[]>(
    initialAgeFilter ? initialAgeFilter.split(',').map((s) => s.trim()).filter(Boolean) : []
  )
  const [, startTransition] = useTransition()

  function save(nextLangs: string[], nextAges: string[]) {
    startTransition(async () => {
      await updateListFilters(
        listId,
        nextLangs.length > 0 ? nextLangs.join(',') : null,
        nextAges.length > 0 ? nextAges.join(',') : null
      )
    })
  }

  function toggleLang(value: string) {
    const next = langs.includes(value) ? langs.filter((v) => v !== value) : [...langs, value]
    setLangs(next)
    save(next, ages)
  }

  function toggleAge(value: string) {
    const next = ages.includes(value) ? ages.filter((v) => v !== value) : [...ages, value]
    setAges(next)
    save(langs, next)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">Indholdsfiltre</h2>

      {/* Language filter */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Sprog</p>
        <div className="flex flex-wrap gap-2">
          {LANG_OPTIONS.map(({ value, label }) => {
            const checked = langs.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleLang(value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  checked
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                {label}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => { setLangs([]); save([], ages) }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              langs.length === 0
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            Alle sprog
          </button>
        </div>
      </div>

      {/* Age filter */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Aldersgruppe</p>
        <div className="flex flex-wrap gap-2">
          {AGE_OPTIONS.map(({ value, label }) => {
            const checked = ages.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleAge(value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  checked
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                {label}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => { setAges([]); save(langs, []) }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              ages.length === 0
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            Alle
          </button>
        </div>
      </div>
    </div>
  )
}
