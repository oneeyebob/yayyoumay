'use client'

import React from 'react'
import Link from 'next/link'
import { lockCurator } from '@/app/curator/actions'

interface Props {
  showAvatar?: boolean
  showSettingsIcon?: boolean
  showLockButton?: boolean
  showTimerIcon?: boolean
  showAccountIcon?: boolean
  profileInitial?: string
  avatarFormAction?: (formData: FormData) => void | Promise<void>
  avatarHref?: string
  logoHref?: string
  sticky?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function SharedHeader({
  showAvatar = false,
  showSettingsIcon = false,
  showLockButton = false,
  showTimerIcon = false,
  showAccountIcon = false,
  profileInitial,
  avatarFormAction,
  avatarHref,
  logoHref = '/',
  sticky = true,
  className,
  style,
}: Props) {
  const headerClass = [
    'bg-white border-b border-gray-100 px-4 py-3',
    sticky ? 'sticky top-0 z-10' : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <header className={headerClass} style={style}>
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <Link href={logoHref} aria-label="Gå til feed" className="ml-3">
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
                className={`flex items-center justify-center border border-gray-300 rounded-md px-3 py-1 hover:opacity-70 transition-opacity text-base font-light text-gray-900`}
              >
                Lås
              </button>
            </form>
          )}
          {showAccountIcon && (
            <Link
              href="/curator/account"
              aria-label="Konto"
              className={`flex items-center justify-center border border-gray-300 rounded-md px-3 py-1 hover:opacity-70 transition-opacity text-base font-light text-gray-900`}
            >
              Konto
            </Link>
          )}
          {showTimerIcon && (
            <Link
              href="/curator/timer"
              aria-label="Skærmtimer"
              className={`flex items-center justify-center border border-gray-300 rounded-md px-3 py-1 hover:opacity-70 transition-opacity text-base font-light text-gray-900`}
            >
              Timer
            </Link>
          )}
          {showSettingsIcon && (
            <Link
              href="/curator"
              aria-label="Kuratormode"
              className={`flex items-center justify-center border border-gray-300 rounded-md px-3 py-1 hover:opacity-70 transition-opacity text-base font-light text-gray-900`}
            >
              Indstil
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
