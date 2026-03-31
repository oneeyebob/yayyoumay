'use client'

import { useRouter } from 'next/navigation'
import { clearProfile } from './actions'

export default function SwitchProfileButton() {
  const router = useRouter()

  async function handleSwitch() {
    await clearProfile()
    router.refresh()
  }

  return (
    <button
      onClick={handleSwitch}
      className="text-xs text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-full px-3 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
    >
      Skift profil
    </button>
  )
}
