'use client'

import { useState } from 'react'
import { updateProfile } from '../actions'
import { updateListSettings, removeListItem } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileData {
  id: string
  name: string
  avatar_color: string
}

export interface ListData {
  id: string
  name: string
  description: string | null
  is_public: boolean
}

export interface ItemRow {
  id: string
  type: 'channel' | 'video'
  title: string
  thumbnail: string | null
  ytId: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#f97316', '#14b8a6',
]

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function textColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#1f2937' : '#ffffff'
}

function normaliseColor(c: string): string {
  return PRESET_COLORS.includes(c) ? c : PRESET_COLORS[0]
}


// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, color, size = 'lg' }: { name: string; color: string; size?: 'lg' | 'sm' }) {
  const cls = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm'
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{ backgroundColor: color, color: textColor(color) }}
    >
      {initials(name || '?')}
    </div>
  )
}

// ── Header ─ inline name edit ─────────────────────────────────────────────────

function ProfileHeader({ profile }: { profile: ProfileData }) {
  const color = normaliseColor(profile.avatar_color)
  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(profile.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!nameValue.trim() || nameValue.trim() === profile.name) {
      setEditing(false)
      setNameValue(profile.name)
      return
    }
    setSaving(true)
    const { error: err } = await updateProfile({
      id: profile.id,
      name: nameValue.trim(),
      avatarColor: profile.avatar_color,
    })
    setSaving(false)
    if (err) { setError(err); return }
    setEditing(false)
    setError(null)
    // Name update reflected on next server render via revalidatePath in action
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setEditing(false); setNameValue(profile.name) }
  }

  return (
    <div className="flex items-center gap-4 mb-6">
      <Avatar name={nameValue || profile.name} color={color} size="lg" />

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 rounded-lg border border-blue-400 px-3 py-1.5 text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '…' : 'Gem'}
            </button>
            <button
              onClick={() => { setEditing(false); setNameValue(profile.name) }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuller
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 truncate">{nameValue}</h1>
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Rediger navn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
              </svg>
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    </div>
  )
}

// ── Indstillinger ─────────────────────────────────────────────────────────────

function SettingsSection({ list, profileId, profileName }: { list: ListData; profileId: string; profileName: string }) {
  const defaultName = `${profileName}s liste`
  const prefix = `${profileName}s `
  const initialSuffix = list.name !== defaultName && list.name.startsWith(prefix)
    ? list.name.slice(prefix.length)
    : ''

  const [suffix, setSuffix] = useState(initialSuffix)
  const [description, setDescription] = useState(list.description ?? '')
  const [isPublic, setIsPublic] = useState(list.is_public)
  const computedName = suffix.trim() ? `${profileName}s ${suffix.trim()}` : defaultName
  const [justEnabled, setJustEnabled] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleTogglePublic() {
    const next = !isPublic
    setIsPublic(next)
    if (next) {
      setJustEnabled(true)
    } else {
      setJustEnabled(false)
    }
    setSaveState('idle')
  }

  async function handleSave() {
    setSaveState('saving')
    setErrorMsg(null)
    const { error } = await updateListSettings({
      listId: list.id,
      langFilter: '',
      ageFilter: '',
      profileId,
      description,
      isPublic,
      listName: computedName,
    })
    if (error) { setErrorMsg(error); setSaveState('error'); return }
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <h2 className="font-bold text-gray-900 mb-4">Indstillinger</h2>

      {/* List name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Listens navn</label>
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-400">
          <span className="shrink-0 text-gray-500">{profileName}s</span>
          <input
            type="text"
            value={suffix}
            onChange={(e) => { setSuffix(e.target.value); setSaveState('idle') }}
            placeholder="ultimative liste om LEGO"
            className="flex-1 min-w-0 focus:outline-none bg-transparent"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          f.eks. &ldquo;{profileName}s ultimative liste om LEGO&rdquo; — tom = &ldquo;{defaultName}&rdquo;
        </p>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Om denne liste <span className="text-gray-400 font-normal">(valgfri - men giver andre forældre mulighed for at søge på {profileName}s indhold)</span>
        </label>
        <textarea
          rows={5}
          value={description}
          onChange={(e) => { setDescription(e.target.value); setSaveState('idle') }}
          placeholder="Denne liste handler om de bedste LEGO byggere i verden, og så er der også nogle videoer jeg selv har valgt til..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Public toggle */}
      <div className="mb-5">
        <p className="text-sm font-medium text-gray-700 mb-2">Del med biblioteket</p>
        <button
          type="button"
          onClick={handleTogglePublic}
          className={[
            'flex items-center gap-3 w-fit rounded-xl px-4 py-2.5 text-sm font-medium border transition-colors',
            isPublic
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100',
          ].join(' ')}
        >
          <span className={[
            'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
            isPublic ? 'bg-indigo-600' : 'bg-gray-300',
          ].join(' ')}>
            <span className={[
              'inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
              isPublic ? 'translate-x-4' : 'translate-x-0',
            ].join(' ')} />
          </span>
          {isPublic ? 'Delt i Biblioteket' : 'Privat'}
        </button>
        {justEnabled && (
          <p className="text-sm text-indigo-600 mt-2">
            Din liste vil nu være synlig i Biblioteket for andre forældre
          </p>
        )}
      </div>

      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{errorMsg}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
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
    </section>
  )
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  profileId,
  onRemove,
}: {
  item: ItemRow
  profileId: string
  onRemove: (id: string) => void
}) {
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    setRemoving(true)
    const { error } = await removeListItem(item.id, profileId)
    if (error) { setRemoving(false); return }
    onRemove(item.id)
  }

  return (
    <li className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      {/* Thumbnail */}
      <div className="w-20 h-[45px] rounded shrink-0 bg-gray-100 overflow-hidden">
        {item.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3.25 4A2.25 2.25 0 0 0 1 6.25v7.5A2.25 2.25 0 0 0 3.25 16h7.5A2.25 2.25 0 0 0 13 13.75v-7.5A2.25 2.25 0 0 0 10.75 4h-7.5ZM19 4.75a.75.75 0 0 0-1.28-.53l-3 3a.75.75 0 0 0-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 0 0 1.28-.53V4.75Z" />
            </svg>
          </div>
        )}
      </div>

      {/* Title + badge */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate leading-snug">{item.title}</p>
        <span className={[
          'inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
          item.type === 'channel' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500',
        ].join(' ')}>
          {item.type === 'channel' ? 'Kanal' : 'Video'}
        </span>
      </div>

      {/* Remove */}
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

// ── Godkendt indhold ──────────────────────────────────────────────────────────

function ContentSection({ profileId, initialItems }: { profileId: string; initialItems: ItemRow[] }) {
  const [items, setItems] = useState<ItemRow[]>(initialItems)
  const [activeTab, setActiveTab] = useState<'channels' | 'videos'>('channels')

  const channels = items.filter((i) => i.type === 'channel')
  const videos = items.filter((i) => i.type === 'video')
  const visible = activeTab === 'channels' ? channels : videos

  function handleRemove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const tabBtn = (tab: 'channels' | 'videos', label: string, count: number) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={[
        'pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors',
        activeTab === tab
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700',
      ].join(' ')}
    >
      {label}
      <span className={[
        'ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
        activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500',
      ].join(' ')}>
        {count}
      </span>
    </button>
  )

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-0">
        <h2 className="font-bold text-gray-900 mb-4">Godkendt indhold</h2>
        <div className="flex border-b border-gray-200 -mx-5 px-5 gap-4">
          {tabBtn('channels', 'Kanaler', channels.length)}
          {tabBtn('videos', 'Videoer', videos.length)}
        </div>
      </div>

      <div className="px-5 py-2">
        {visible.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-2xl mb-2">{activeTab === 'channels' ? '📺' : '🎬'}</p>
            <p className="text-sm text-gray-500">
              {activeTab === 'channels' ? 'Ingen godkendte kanaler endnu' : 'Ingen godkendte videoer endnu'}
            </p>
          </div>
        ) : (
          <ul>
            {visible.map((item) => (
              <ItemRow key={item.id} item={item} profileId={profileId} onRemove={handleRemove} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ProfileDetailUI({
  profile,
  list,
  items,
}: {
  profile: ProfileData
  list: ListData | null
  items: ItemRow[]
}) {
  return (
    <>
      <ProfileHeader profile={profile} />
      {list ? (
        <>
          <SettingsSection list={list} profileId={profile.id} profileName={profile.name} />
          <ContentSection profileId={profile.id} initialItems={items} />
        </>
      ) : (
        <p className="text-sm text-gray-500 text-center py-8">Ingen liste fundet for denne profil.</p>
      )}
    </>
  )
}
