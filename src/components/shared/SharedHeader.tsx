'use client'

import Link from 'next/link'
import { lockCurator } from '@/app/curator/actions'

interface Props {
  showAvatar?: boolean
  showSettingsIcon?: boolean
  showLockButton?: boolean
  profileInitial?: string
  avatarFormAction?: (formData: FormData) => void | Promise<void>
  avatarHref?: string
  sticky?: boolean
  className?: string
}

export default function SharedHeader({
  showAvatar = false,
  showSettingsIcon = false,
  showLockButton = false,
  profileInitial,
  avatarFormAction,
  avatarHref,
  sticky = true,
  className,
}: Props) {
  const headerClass = [
    'bg-white border-b border-gray-100 px-4 py-3',
    sticky ? 'sticky top-0 z-10' : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <header className={headerClass}>
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <Link href="/" aria-label="Gå til feed">
          <img
            src="/yay-logo-compact.svg"
            alt="YAY!"
            className="h-10 w-auto transition-[filter] duration-200 hover:[filter:brightness(0)_saturate(100%)_invert(16%)_sepia(100%)_saturate(7481%)_hue-rotate(1deg)_brightness(103%)_contrast(104%)] active:[filter:brightness(0)_saturate(100%)_invert(10%)_sepia(100%)_saturate(9999%)_hue-rotate(1deg)_brightness(90%)]"
          />
        </Link>
        <div className="flex items-center gap-3">
          {showLockButton && (
            <form action={lockCurator}>
              <button
                type="submit"
                aria-label="Lås kuratormode"
                className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="currentColor" className="w-10 h-10 text-gray-500" aria-hidden>
                  <path fillRule="evenodd" d="M14 18v-4a6 6 0 1 1 12 0v4h1a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3h1Zm4-4a2 2 0 1 1 4 0v4h-4v-4Zm2 9a2 2 0 0 0-1 3.732V28a1 1 0 1 0 2 0v-1.268A2 2 0 0 0 20 23Z" clipRule="evenodd" />
                </svg>
              </button>
            </form>
          )}
          {showSettingsIcon && (
            <Link
              href="/curator"
              aria-label="Kuratormode"
              className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity"
            >
              <img src="/settings-icon.svg" alt="Kuratormode" className="h-10 w-10" />
            </Link>
          )}
          {showAvatar && profileInitial && (
            avatarFormAction ? (
              <form action={avatarFormAction}>
                <button
                  type="submit"
                  aria-label={`Skift profil (${profileInitial})`}
                  className="w-10 h-10 rounded-full bg-transparent border-2 border-black text-black font-semibold text-2xl flex items-center justify-center hover:bg-indigo-200 active:bg-indigo-300 transition-colors"
                >
                  {profileInitial}
                </button>
              </form>
            ) : avatarHref ? (
              <Link
                href={avatarHref}
                aria-label={profileInitial}
                className="w-10 h-10 rounded-full bg-transparent border-2 border-black text-black font-semibold text-2xl flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                {profileInitial}
              </Link>
            ) : (
              <div
                className="w-10 h-10 rounded-full bg-transparent border-2 border-black text-black font-semibold text-2xl flex items-center justify-center"
                aria-label={profileInitial}
              >
                {profileInitial}
              </div>
            )
          )}
        </div>
      </div>
    </header>
  )
}
