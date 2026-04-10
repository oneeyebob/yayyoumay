'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { addFromUrl } from '@/app/curator/actions'
import {
  createAdminList,
  deleteAdminList,
  toggleAdminListPublic,
  removeAdminUser,
  addAdminUser,
} from './actions'

export interface AdminList {
  id: string
  name: string
  description: string | null
  is_public: boolean
  item_count: number
}

export interface AdminUser {
  id: string
  user_id: string
  username: string | null
  role: string
  created_at: string
}

interface Props {
  lists: AdminList[]
  adminUsers: AdminUser[]
  isSuperAdmin: boolean
  currentUserId: string
}

// ── Tilføj URL ────────────────────────────────────────────────────────────────

function AddUrlSection({ lists }: { lists: AdminList[] }) {
  const [listId, setListId] = useState(lists[0]?.id ?? '')
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [, startTransition] = useTransition()
  const [isPending, setIsPending] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed || !listId) return
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
        window.location.reload()
      }
    })
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Tilføj YouTube URL</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <select
          value={listId}
          onChange={(e) => setListId(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
        >
          {lists.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setResult(null) }}
            placeholder="Indsæt YouTube URL..."
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
          />
          <button
            type="submit"
            disabled={isPending || !url.trim() || !listId}
            className="shrink-0 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden /> : 'Tilføj'}
          </button>
        </div>
        {result && (
          <p className={`text-xs font-medium ${result.ok ? 'text-green-600' : 'text-red-500'}`}>
            {result.message}
          </p>
        )}
      </form>
    </section>
  )
}

// ── Bibliotekslister ──────────────────────────────────────────────────────────

function ListsSection({ lists }: { lists: AdminList[] }) {
  const [localLists, setLocalLists] = useState(lists)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    setError(null)
    startTransition(async () => {
      const res = await createAdminList(name)
      setCreating(false)
      if (res.error) { setError(res.error); return }
      setNewName('')
      setShowNew(false)
      window.location.reload()
    })
  }

  function handleDelete(listId: string) {
    if (!confirm('Slet denne liste permanent?')) return
    startTransition(async () => {
      const res = await deleteAdminList(listId)
      if (res.error) { setError(res.error); return }
      setLocalLists((prev) => prev.filter((l) => l.id !== listId))
    })
  }

  function handleTogglePublic(listId: string, current: boolean) {
    startTransition(async () => {
      const res = await toggleAdminListPublic(listId, !current)
      if (res.error) { setError(res.error); return }
      setLocalLists((prev) => prev.map((l) => l.id === listId ? { ...l, is_public: !current } : l))
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Bibliotekslister</h2>
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
        >
          Ny liste
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Listenavn..."
            autoFocus
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="shrink-0 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {creating ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden /> : 'Opret'}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-3">
        {localLists.map((list) => (
          <div key={list.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{list.name}</p>
              {list.description && (
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{list.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{list.item_count} items</p>
              <button
                onClick={() => handleTogglePublic(list.id, list.is_public)}
                className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  list.is_public
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${list.is_public ? 'bg-green-500' : 'bg-gray-400'}`} />
                {list.is_public ? 'Offentlig' : 'Privat'}
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/admin/lists/${list.id}`}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Rediger
              </Link>
              <button
                onClick={() => handleDelete(list.id)}
                className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                Slet
              </button>
            </div>
          </div>
        ))}
        {localLists.length === 0 && (
          <p className="text-sm text-gray-400 italic">Ingen lister endnu.</p>
        )}
      </div>
    </section>
  )
}

// ── Brugeradministration ──────────────────────────────────────────────────────

function AdminUsersSection({ adminUsers, currentUserId }: { adminUsers: AdminUser[]; currentUserId: string }) {
  const [users, setUsers] = useState(adminUsers)
  const [showAdd, setShowAdd] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'super_admin'>('admin')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleRemove(userId: string) {
    if (!confirm('Fjern admin-adgang for denne bruger?')) return
    startTransition(async () => {
      const res = await removeAdminUser(userId)
      if (res.error) { setError(res.error); return }
      setUsers((prev) => prev.filter((u) => u.user_id !== userId))
    })
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newUsername.trim()) return
    setAdding(true)
    setError(null)
    startTransition(async () => {
      const res = await addAdminUser(newUsername.trim(), newRole)
      setAdding(false)
      if (res.error) { setError(res.error); return }
      setNewUsername('')
      setShowAdd(false)
      window.location.reload()
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Brugeradministration</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
        >
          Tilføj admin
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Brugernavn..."
            autoFocus
            className="flex-1 min-w-40 rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as 'admin' | 'super_admin')}
            className="rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
          >
            <option value="admin">admin</option>
            <option value="super_admin">super_admin</option>
          </select>
          <button
            type="submit"
            disabled={adding || !newUsername.trim()}
            className="shrink-0 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {adding ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden /> : 'Tilføj'}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Brugernavn</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rolle</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Oprettet</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 font-medium text-gray-900">{u.username ?? <span className="text-gray-400 italic">ukendt</span>}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    u.role === 'super_admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}>{u.role}</span>
                </td>
                <td className="px-5 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString('da-DK')}</td>
                <td className="px-5 py-3 text-right">
                  {u.user_id !== currentUserId && (
                    <button
                      onClick={() => handleRemove(u.user_id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                    >
                      Fjern adgang
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminUI({ lists, adminUsers, isSuperAdmin, currentUserId }: Props) {
  return (
    <div className="space-y-8">
      <AddUrlSection lists={lists} />
      <ListsSection lists={lists} />
      {isSuperAdmin && (
        <AdminUsersSection adminUsers={adminUsers} currentUserId={currentUserId} />
      )}
    </div>
  )
}
