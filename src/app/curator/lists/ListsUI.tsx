'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createList, updateList, deleteList } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ListRow {
  id: string
  name: string
  description: string | null
  lang_filter: string | null
  profile_id: string
  profileName: string
  yayCount: number
}

export interface ProfileOption {
  id: string
  name: string
}

const LANGUAGES = [
  { value: 'dansk',   label: 'Dansk' },
  { value: 'engelsk', label: 'Engelsk' },
  { value: 'norsk',   label: 'Norsk' },
  { value: 'svensk',  label: 'Svensk' },
]

// ── Form modal ────────────────────────────────────────────────────────────────

interface FormState {
  id: string | null   // null = creating new
  name: string
  profileId: string
  langFilter: string[]
  description: string
}

function ListFormModal({
  form,
  profiles,
  onClose,
  onSave,
}: {
  form: FormState
  profiles: ProfileOption[]
  onClose: () => void
  onSave: (next: FormState) => Promise<void>
}) {
  const [values, setValues] = useState<FormState>(form)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = form.id !== null

  function toggleLang(lang: string) {
    setValues((v) => ({
      ...v,
      langFilter: v.langFilter.includes(lang)
        ? v.langFilter.filter((l) => l !== lang)
        : [...v.langFilter, lang],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.name.trim()) { setError('Navn er påkrævet.'); return }
    if (!values.profileId) { setError('Vælg en profil.'); return }

    setError(null)
    setLoading(true)
    await onSave(values)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">
            {isEditing ? 'Rediger liste' : 'Opret ny liste'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Listenavn</label>
            <input
              type="text"
              required
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="f.eks. Alberts favoritter"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Profile selector — only shown when creating */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profil</label>
              <select
                required
                value={values.profileId}
                onChange={(e) => setValues((v) => ({ ...v, profileId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Vælg profil…</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Language filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sprogfilter</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => {
                const checked = values.langFilter.includes(lang.value)
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
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              placeholder="Kort beskrivelse af listen…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Gemmer…' : 'Gem liste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete confirmation ───────────────────────────────────────────────────────

function DeleteConfirm({
  listName,
  onConfirm,
  onCancel,
  loading,
}: {
  listName: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-3 space-y-2">
      <p className="text-sm text-red-700 font-medium">
        Slet &ldquo;{listName}&rdquo;?
      </p>
      <p className="text-xs text-red-500">
        Dette sletter listen og alle dens indhold permanent.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Annuller
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Sletter…' : 'Ja, slet'}
        </button>
      </div>
    </div>
  )
}

// ── Main UI ───────────────────────────────────────────────────────────────────

export default function ListsUI({
  lists,
  profiles,
}: {
  lists: ListRow[]
  profiles: ProfileOption[]
}) {
  const [formState, setFormState] = useState<FormState | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  function openCreate() {
    setFormState({
      id: null,
      name: '',
      profileId: profiles[0]?.id ?? '',
      langFilter: [],
      description: '',
    })
  }

  function openEdit(list: ListRow) {
    setFormState({
      id: list.id,
      name: list.name,
      profileId: list.profile_id,
      langFilter: list.lang_filter ? list.lang_filter.split(',') : [],
      description: list.description ?? '',
    })
  }

  async function handleSave(values: FormState) {
    const langFilter = values.langFilter.join(',')
    let result: { error: string | null }

    if (values.id) {
      result = await updateList({
        id: values.id,
        name: values.name,
        langFilter,
        description: values.description,
      })
    } else {
      result = await createList({
        name: values.name,
        profileId: values.profileId,
        langFilter,
        description: values.description,
      })
    }

    if (result.error) {
      setGlobalError(result.error)
      return
    }

    setFormState(null)
    setGlobalError(null)
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true)
    const { error } = await deleteList(id)
    setDeleteLoading(false)
    if (error) { setGlobalError(error); return }
    setDeleteId(null)
  }

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Lister</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Opret ny liste
        </button>
      </div>

      {globalError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {globalError}
        </p>
      )}

      {/* List cards */}
      {lists.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-gray-700 font-medium mb-1">Ingen lister endnu</p>
          <p className="text-sm text-gray-400">Opret din første liste for at komme i gang.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {lists.map((list) => (
            <li key={list.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              {/* Card header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/curator/lists/${list.id}`}
                    className="font-semibold text-gray-900 hover:text-blue-600 truncate block transition-colors"
                  >
                    {list.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    <span className="text-xs text-gray-500">👤 {list.profileName}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-500">👍 {list.yayCount} godkendt{list.yayCount === 1 ? '' : 'e'}</span>
                    {list.lang_filter && (
                      <>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-blue-600 capitalize">{list.lang_filter.replace(/,/g, ', ')}</span>
                      </>
                    )}
                  </div>
                  {list.description && (
                    <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{list.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => openEdit(list)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    Rediger
                  </button>
                  <button
                    onClick={() => setDeleteId(deleteId === list.id ? null : list.id)}
                    className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Slet
                  </button>
                </div>
              </div>

              {/* Inline delete confirmation */}
              {deleteId === list.id && (
                <DeleteConfirm
                  listName={list.name}
                  onConfirm={() => handleDelete(list.id)}
                  onCancel={() => setDeleteId(null)}
                  loading={deleteLoading}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Create / Edit modal */}
      {formState && (
        <ListFormModal
          form={formState}
          profiles={profiles}
          onClose={() => setFormState(null)}
          onSave={handleSave}
        />
      )}
    </>
  )
}
