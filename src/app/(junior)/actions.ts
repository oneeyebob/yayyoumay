'use server'

import { cookies } from 'next/headers'

export async function selectProfile(profileId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('active_profile_id', profileId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // No maxAge — session cookie, cleared when browser closes
  })
}

export async function clearProfile(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('active_profile_id')
}
