'use client'

import { useState, useTransition } from 'react'
import { addFromUrl } from '@/app/curator/actions'
import { updateListMeta, toggleListPublic, removeItem, addListTag, removeListTag, createAndAddTag } from './actions'

export interface ListDetail {
  id: string
  name: string
  description: string | null
  is_public: boolean
}

export interface TagRow {
  id: string
  slug: string
  category: string | null
  label_da: string | null
}

export interface ItemRow {
  id: string
  type: 'channel' | 'video'
  title: string
  thumbnail: string | null
  ytId: string
}

interface Props {
  list: ListDetail
  items: ItemRow[]
  allTags: TagRow[]
  activeTagIds: string[]
}

// ── Meta editor ───────────────────────────────────────────────────────────────

function MetaSection({ list }: { list: ListDetail }) {
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description ?? '')
  const [isPublic, setIsPublic] = useState(list.is_public)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateListMeta(list.id, name, description || null)
      setSaving(false)
      if (res.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  function handleTogglePublic() {
    const next = !isPublic
    setIsPublic(next)
    startTransition(async () => {
      const res = await toggleListPublic(list.id, next)
      if (res.error) { setIsPublic(!next); setError(res.error) }
    })
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Listedetaljer</h2>
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Navn</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Beskrivelse</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Beskriv hvad listen handler om..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors resize-none"
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleTogglePublic}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              isPublic
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${isPublic ? 'bg-green-500' : 'bg-gray-400'}`} />
            {isPublic ? 'Offentlig' : 'Privat'}
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {saving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden /> : saved ? 'Gemt ✓' : 'Gem'}
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </section>
  )
}

// ── Tilføj URL ────────────────────────────────────────────────────────────────

function AddUrlSection({ listId, onAdded }: { listId: string; onAdded: (item: ItemRow) => void }) {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    setResult(null)
    setIsPending(true)
    startTransition(async () => {
      const res = await addFromUrl(trimmed, listId)
      setIsPending(false)
      if (res.error) {
        setResult({ ok: false, message: res.error })
      } else {
        setResult({ ok: true, message: `Tilføjet: ${res.title ?? ''}`.trim() })
        setUrl('')
        // Reload to pick up the new item with full data
        window.location.reload()
      }
    })
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
      <h2 className="text-base font-semibold text-gray-900">Tilføj YouTube URL</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setResult(null) }}
          placeholder="Indsæt YouTube URL (video eller kanal)..."
          className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
        />
        <button
          type="submit"
          disabled={isPending || !url.trim()}
          className="shrink-0 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden /> : 'Tilføj'}
        </button>
      </form>
      {result && (
        <p className={`text-xs font-medium ${result.ok ? 'text-green-600' : 'text-red-500'}`}>
          {result.message}
        </p>
      )}
    </section>
  )
}

// ── Items liste ───────────────────────────────────────────────────────────────

function ItemsSection({ listId, items }: { listId: string; items: ItemRow[] }) {
  const [localItems, setLocalItems] = useState(items)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleRemove(itemId: string) {
    setRemoving(itemId)
    setError(null)
    startTransition(async () => {
      const res = await removeItem(itemId, listId)
      setRemoving(null)
      if (res.error) { setError(res.error); return }
      setLocalItems((prev) => prev.filter((i) => i.id !== itemId))
    })
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">
        Indhold <span className="text-sm font-normal text-gray-400">({localItems.length})</span>
      </h2>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {localItems.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Ingen items endnu — tilføj via URL ovenfor.</p>
      ) : (
        <div className="space-y-2">
          {localItems.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
              {item.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnail}
                  alt=""
                  className="h-14 w-24 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="h-14 w-24 rounded-lg bg-gray-100 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.type === 'channel' ? 'Kanal' : 'Video'}</p>
              </div>
              <button
                onClick={() => handleRemove(item.id)}
                disabled={removing === item.id}
                className="shrink-0 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                {removing === item.id
                  ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" aria-hidden />
                  : 'Fjern'}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Tags ─────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  alderstrin: 'Alderstrin',
  sprog: 'Sprog',
  emne: 'Emne',
  tone: 'Tone',
}

const CATEGORY_ORDER = ['alderstrin', 'sprog', 'emne', 'tone']

function TagsSection({
  listId,
  allTags,
  activeTagIds,
}: {
  listId: string
  allTags: TagRow[]
  activeTagIds: string[]
}) {
  const [localTags, setLocalTags] = useState<TagRow[]>(allTags)
  const [active, setActive] = useState<Set<string>>(new Set(activeTagIds))
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newLabels, setNewLabels] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleToggle(tagId: string) {
    if (pending) return
    setPending(tagId)
    setError(null)
    const isActive = active.has(tagId)
    startTransition(async () => {
      const res = isActive
        ? await removeListTag(listId, tagId)
        : await addListTag(listId, tagId)
      setPending(null)
      if (res.error) { setError(res.error); return }
      setActive((prev) => {
        const next = new Set(prev)
        isActive ? next.delete(tagId) : next.add(tagId)
        return next
      })
    })
  }

  function handleCreate(cat: string) {
    const label = (newLabels[cat] ?? '').trim()
    if (!label) return
    setCreating(cat)
    setError(null)
    startTransition(async () => {
      const res = await createAndAddTag(listId, cat, label)
      setCreating(null)
      if (res.error) { setError(res.error); return }
      if (res.tag) {
        const newTag: TagRow = { id: res.tag.id, slug: res.tag.slug, category: cat, label_da: res.tag.label_da }
        setLocalTags((prev) => [...prev, newTag])
        setActive((prev) => new Set([...prev, res.tag!.id]))
        setNewLabels((prev) => ({ ...prev, [cat]: '' }))
      }
    })
  }

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    tags: localTags.filter((t) => t.category === cat),
  })).filter((g) => g.tags.length > 0 || CATEGORY_ORDER.includes(g.cat))

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Tags</h2>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="space-y-5">
        {byCategory.map(({ cat, label, tags }) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => {
                const isActive = active.has(tag.id)
                const isLoading = pending === tag.id
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggle(tag.id)}
                    disabled={!!pending}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {isLoading && (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                    )}
                    {tag.label_da ?? tag.slug}
                  </button>
                )
              })}
            </div>
            {/* Tilføj nyt tag til denne kategori */}
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={newLabels[cat] ?? ''}
                onChange={(e) => setNewLabels((prev) => ({ ...prev, [cat]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(cat) } }}
                placeholder={`Nyt ${label.toLowerCase()} tag...`}
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-200 transition-colors"
              />
              <button
                onClick={() => handleCreate(cat)}
                disabled={!newLabels[cat]?.trim() || creating === cat}
                className="shrink-0 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                {creating === cat
                  ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                  : 'Tilføj'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ListEditUI({ list, items, allTags, activeTagIds }: Props) {
  return (
    <div className="space-y-6">
      <MetaSection list={list} />
      <TagsSection listId={list.id} allTags={allTags} activeTagIds={activeTagIds} />
      <AddUrlSection listId={list.id} onAdded={() => {}} />
      <ItemsSection listId={list.id} items={items} />
    </div>
  )
}
