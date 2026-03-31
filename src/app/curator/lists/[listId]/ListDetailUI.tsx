'use client'

import { useState } from 'react'
import { updateList } from '../actions'
import { removeListItem } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ListDetail {
  id: string
  name: string
  description: string | null
  lang_filter: string | null
}

export interface ListItemRow {
  id: string
  status: 'yay' | 'nay'
  type: 'channel' | 'video'
  title: string
  thumbnail: string | null
  ytId: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: 'dansk',   label: 'Dansk' },
  { value: 'engelsk', label: 'Engelsk' },
  { value: 'norsk',   label: 'Norsk' },
  { value: 'svensk',  label: 'Svensk' },
]

// ── Settings section ──────────────────────────────────────────────────────────

function SettingsSection({ list }: { list: ListDetail }) {
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description ?? '')
  const [langFilter, setLangFilter] = useState<string[]>(
    list.lang_filter ? list.lang_filter.split(',') : []
  )
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function toggleLang(lang: string) {
    setLangFilter((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
    if (saveState === 'saved') setSaveState('idle')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaveState('saving')
    setErrorMsg(null)

    const { error } = await updateList({
      id: list.id,
      name: name.trim(),
      langFilter: langFilter.join(','),
      description,
    })

    if (error) {
      setErrorMsg(error)
      setSaveState('error')
      return
    }

    setSaveState('saved')
    // Reset to idle after 2 s
    setTimeout(() => setSaveState('idle'), 2000)
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <h2 className="font-bold text-gray-900 mb-4">Indstillinger</h2>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Listenavn</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => { setName(e.target.value); if (saveState === 'saved') setSaveState('idle') }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Language filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sprogfilter</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => {
              const checked = langFilter.includes(lang.value)
              return (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => toggleLang(lang.value)}
                  className={[
                    'rounded-full px-3 py-1 text-sm font-medium border transition-colors',
                    checked
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400',
                  ].join(' ')}
                >
                  {lang.label}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Ingen valgt = alt indhold vises</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beskrivelse <span className="text-gray-400 font-normal">(valgfri)</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => { setDescription(e.target.value); if (saveState === 'saved') setSaveState('idle') }}
            placeholder="Kort beskrivelse af listen…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saveState === 'saving'}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saveState === 'saving' ? 'Gemmer…' : 'Gem indstillinger'}
          </button>

          {saveState === 'saved' && (
            <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
              Gemt
            </span>
          )}
        </div>
      </form>
    </section>
  )
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  listId,
  onRemove,
}: {
  item: ListItemRow
  listId: string
  onRemove: (id: string) => void
}) {
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    setRemoving(true)
    const { error } = await removeListItem(item.id, listId)
    if (error) {
      setRemoving(false)
      return
    }
    onRemove(item.id)
  }

  return (
    <li className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      {/* Thumbnail */}
      <div className="w-20 h-[45px] rounded shrink-0 bg-gray-100 overflow-hidden">
        {item.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
              <path d="M3.25 4A2.25 2.25 0 0 0 1 6.25v7.5A2.25 2.25 0 0 0 3.25 16h7.5A2.25 2.25 0 0 0 13 13.75v-7.5A2.25 2.25 0 0 0 10.75 4h-7.5ZM19 4.75a.75.75 0 0 0-1.28-.53l-3 3a.75.75 0 0 0-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 0 0 1.28-.53V4.75Z" />
            </svg>
          </div>
        )}
      </div>

      {/* Title + badge */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate leading-snug">{item.title}</p>
        <span
          className={[
            'inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            item.type === 'channel'
              ? 'bg-teal-100 text-teal-700'
              : 'bg-gray-100 text-gray-500',
          ].join(' ')}
        >
          {item.type === 'channel' ? 'Kanal' : 'Video'}
        </span>
      </div>

      {/* Remove button */}
      <button
        onClick={handleRemove}
        disabled={removing}
        aria-label="Fjern"
        className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
      >
        {removing ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        )}
      </button>
    </li>
  )
}

// ── Content section ───────────────────────────────────────────────────────────

function ContentSection({ listId, initialItems }: { listId: string; initialItems: ListItemRow[] }) {
  const [items, setItems] = useState<ListItemRow[]>(initialItems)
  const [activeTab, setActiveTab] = useState<'yay' | 'nay'>('yay')

  function handleRemove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const yayItems = items.filter((i) => i.status === 'yay')
  const nayItems = items.filter((i) => i.status === 'nay')
  const visible = activeTab === 'yay' ? yayItems : nayItems

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-0">
        <h2 className="font-bold text-gray-900 mb-4">Indhold</h2>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 -mx-5 px-5 gap-1">
          <button
            onClick={() => setActiveTab('yay')}
            className={[
              'pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'yay'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            👍 Godkendte
            <span className={[
              'ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
              activeTab === 'yay' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500',
            ].join(' ')}>
              {yayItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('nay')}
            className={[
              'pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'nay'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            👎 Afviste
            <span className={[
              'ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
              activeTab === 'nay' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500',
            ].join(' ')}>
              {nayItems.length}
            </span>
          </button>
        </div>
      </div>

      <div className="px-5 py-2">
        {visible.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-2xl mb-2">{activeTab === 'yay' ? '👍' : '👎'}</p>
            <p className="text-sm text-gray-500">
              {activeTab === 'yay'
                ? 'Ingen godkendt indhold endnu'
                : 'Ingen afviste elementer'}
            </p>
          </div>
        ) : (
          <ul>
            {visible.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                listId={listId}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ListDetailUI({
  list,
  items,
}: {
  list: ListDetail
  items: ListItemRow[]
}) {
  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-5">{list.name}</h1>
      <SettingsSection list={list} />
      <ContentSection listId={list.id} initialItems={items} />
    </>
  )
}
