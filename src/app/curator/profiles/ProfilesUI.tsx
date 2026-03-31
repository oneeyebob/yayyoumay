'use client'

import { useState } from 'react'
import { createProfile, updateProfile, deleteProfile } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string
  name: string
  avatar_color: string
  listCount: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f97316', // orange
  '#14b8a6', // teal
]

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function textColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1f2937' : '#ffffff'
}

// ── Color picker ──────────────────────────────────────────────────────────────

function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Farve</label>
      <div className="flex flex-wrap gap-2.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="w-9 h-9 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
            style={{ backgroundColor: color }}
            aria-label={color}
          >
            {value === color && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill={textColor(color)} className="w-4 h-4 mx-auto">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-lg'
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{ backgroundColor: color, color: textColor(color) }}
    >
      {initials(name)}
    </div>
  )
}

// ── Form modal ────────────────────────────────────────────────────────────────

interface FormState {
  id: string | null
  name: string
  avatarColor: string
}

function ProfileFormModal({
  form,
  onClose,
  onSave,
}: {
  form: FormState
  onClose: () => void
  onSave: (values: FormState) => Promise<void>
}) {
  const [values, setValues] = useState<FormState>(form)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = form.id !== null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.name.trim()) { setError('Navn er påkrævet.'); return }
    setError(null)
    setLoading(true)
    await onSave(values)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">
            {isEditing ? 'Rediger profil' : 'Tilføj profil'}
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

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
          {/* Live avatar preview */}
          <div className="flex justify-center">
            <Avatar
              name={values.name || '?'}
              color={values.avatarColor}
              size="md"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
            <input
              type="text"
              required
              autoFocus
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="f.eks. Albert"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Color picker */}
          <ColorPicker
            value={values.avatarColor}
            onChange={(color) => setValues((v) => ({ ...v, avatarColor: color }))}
          />

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
              {loading ? 'Gemmer…' : 'Gem profil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete confirmation ───────────────────────────────────────────────────────

function DeleteConfirm({
  profile,
  onConfirm,
  onCancel,
  loading,
}: {
  profile: ProfileRow
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-3 space-y-2">
      <p className="text-sm text-red-700 font-medium">
        Slet &ldquo;{profile.name}&rdquo;?
      </p>
      {profile.listCount > 0 && (
        <p className="text-xs text-red-500">
          ⚠️ Denne profil har {profile.listCount} liste{profile.listCount === 1 ? '' : 'r'} som også slettes.
        </p>
      )}
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

export default function ProfilesUI({ profiles }: { profiles: ProfileRow[] }) {
  const [formState, setFormState] = useState<FormState | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  function openCreate() {
    setFormState({ id: null, name: '', avatarColor: PRESET_COLORS[0] })
  }

  function openEdit(profile: ProfileRow) {
    setFormState({
      id: profile.id,
      name: profile.name,
      avatarColor: PRESET_COLORS.includes(profile.avatar_color)
        ? profile.avatar_color
        : PRESET_COLORS[0],
    })
  }

  async function handleSave(values: FormState) {
    const result = values.id
      ? await updateProfile({ id: values.id, name: values.name, avatarColor: values.avatarColor })
      : await createProfile({ name: values.name, avatarColor: values.avatarColor })

    if (result.error) { setGlobalError(result.error); return }
    setFormState(null)
    setGlobalError(null)
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true)
    const { error } = await deleteProfile(id)
    setDeleteLoading(false)
    if (error) { setGlobalError(error); return }
    setDeleteId(null)
  }

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Profiler</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Tilføj profil
        </button>
      </div>

      {globalError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {globalError}
        </p>
      )}

      {profiles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">👤</p>
          <p className="text-gray-700 font-medium mb-1">Ingen profiler endnu</p>
          <p className="text-sm text-gray-400">Tilføj den første profil til husstanden.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {profiles.map((profile) => (
            <li key={profile.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <Avatar name={profile.name} color={profile.avatar_color} size="sm" />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{profile.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {profile.listCount === 0
                      ? 'Ingen lister'
                      : `${profile.listCount} liste${profile.listCount === 1 ? '' : 'r'}`}
                  </p>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => openEdit(profile)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    Rediger
                  </button>
                  <button
                    onClick={() => setDeleteId(deleteId === profile.id ? null : profile.id)}
                    className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Slet
                  </button>
                </div>
              </div>

              {deleteId === profile.id && (
                <DeleteConfirm
                  profile={profile}
                  onConfirm={() => handleDelete(profile.id)}
                  onCancel={() => setDeleteId(null)}
                  loading={deleteLoading}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {formState && (
        <ProfileFormModal
          form={formState}
          onClose={() => setFormState(null)}
          onSave={handleSave}
        />
      )}
    </>
  )
}
