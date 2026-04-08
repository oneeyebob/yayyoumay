'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { selectProfile, createProfile } from '@/app/(junior)/actions'

interface Profile {
  id: string
  name: string
  avatar_color: string
}

interface ProfilePickerProps {
  profiles: Profile[]
}

// Derive initials from a display name
function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Fallback palette when avatar_color is the default black
const FALLBACK_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f97316', // orange
  '#14b8a6', // teal
]

function avatarColor(profile: Profile, index: number): string {
  if (profile.avatar_color && profile.avatar_color !== '#000000') {
    return profile.avatar_color
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

// Decide whether to use white or dark text based on background luminance
function textColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1f2937' : '#ffffff'
}

export default function ProfilePicker({ profiles }: ProfilePickerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [creating, setCreating] = useState(false)

  async function handleSelect(profileId: string) {
    setLoading(profileId)
    await selectProfile(profileId)
    router.refresh()
  }

  async function handleCreate() {
    setCreating(true)
    await createProfile(newName, newColor)
    setCreating(false)
    setShowModal(false)
    setNewName('')
    setNewColor('#6366f1')
    router.refresh()
  }

  const previewBg = newColor
  const previewFg = textColor(previewBg)
  const previewInitials = newName.trim() ? initials(newName) : '?'

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="grid grid-cols-2 gap-6 w-full max-w-xs sm:max-w-sm">
          {profiles.map((profile, index) => {
            const bg = avatarColor(profile, index)
            const fg = textColor(bg)
            const isLoading = loading === profile.id

            return (
              <button
                key={profile.id}
                onClick={() => handleSelect(profile.id)}
                disabled={loading !== null}
                className="flex flex-col items-center gap-3 group focus:outline-none disabled:opacity-60"
              >
                {/* Avatar circle */}
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold shadow-md transition-transform group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-offset-2 group-focus-visible:ring-blue-400"
                  style={{ backgroundColor: bg, color: fg, fontFamily: 'var(--font-permanent-marker)' }}
                >
                  {isLoading ? (
                    <span
                      className="inline-block w-6 h-6 rounded-full border-[3px] border-current border-t-transparent animate-spin"
                      style={{ borderColor: `${fg}40`, borderTopColor: 'transparent' }}
                    />
                  ) : (
                    initials(profile.name)
                  )}
                </div>

                {/* Name */}
                <span
                  className="text-sm font-semibold text-gray-800 text-center leading-tight"
                  style={{ fontFamily: 'var(--font-permanent-marker)' }}
                >
                  {profile.name}
                </span>
              </button>
            )
          })}

          {/* Add profile button */}
          <button
            onClick={() => setShowModal(true)}
            disabled={loading !== null}
            className="flex flex-col items-center gap-3 group focus:outline-none disabled:opacity-60"
          >
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl bg-transparent border-2 border-dashed border-gray-400 text-gray-400 transition-transform group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-offset-2 group-focus-visible:ring-blue-400">
              +
            </div>
            <span
              className="text-sm font-semibold text-gray-400 text-center leading-tight"
              style={{ fontFamily: 'var(--font-permanent-marker)' }}
            >
              Ny profil
            </span>
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h2 className="text-lg font-semibold">Ny profil</h2>

            <input
              type="text"
              placeholder="Navn"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Vælg farve</label>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-gray-300"
              />
            </div>

            {/* Preview */}
            <div className="flex justify-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold shadow-md"
                style={{ backgroundColor: previewBg, color: previewFg, fontFamily: 'var(--font-permanent-marker)' }}
              >
                {previewInitials}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowModal(false); setNewName(''); setNewColor('#6366f1') }}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuller
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? 'Opretter…' : 'Opret'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

