'use server'

import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const RECOVERY_COOKIE = 'recovery_token'
const RECOVERY_TTL_SECONDS = 15 * 60 // 15 minutes

// ── recoverAccount ────────────────────────────────────────────────────────────
// Scans user_settings for a row whose hotkey_hash matches the provided key.
// On match: sets a short-lived httpOnly recovery_token cookie and redirects
// to the reset-password page. On no match: returns an error string.

export async function recoverAccount(
  hotkey: string
): Promise<{ error: string }> {
  const normalised = hotkey.replace(/\s+/g, '').toUpperCase()

  if (normalised.length !== 32) {
    return { error: 'Nøglen skal være præcis 32 tegn.' }
  }

  const supabase = await createClient()
  const { data: rows, error: dbError } = await supabase
    .from('user_settings')
    .select('user_id, hotkey_hash')

  if (dbError || !rows) {
    return { error: 'Der opstod en fejl. Prøv igen.' }
  }

  // Iterate rows and bcrypt-compare — necessary because hashes cannot be searched
  for (const row of rows) {
    if (!row.hotkey_hash) continue
    const match = await bcrypt.compare(normalised, row.hotkey_hash)
    if (match) {
      const cookieStore = await cookies()
      cookieStore.set(RECOVERY_COOKIE, row.user_id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: RECOVERY_TTL_SECONDS,
      })
      redirect('/recover/reset-password')
    }
  }

  return { error: 'Nøgle ikke genkendt.' }
}

// ── resetPassword ─────────────────────────────────────────────────────────────
// Reads the recovery_token cookie, updates the user's password via the admin
// API, then clears the cookie and redirects to /login.

export async function resetPassword(
  newPassword: string
): Promise<{ error: string }> {
  const cookieStore = await cookies()
  const userId = cookieStore.get(RECOVERY_COOKIE)?.value

  if (!userId) {
    redirect('/recover')
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) {
    return { error: 'Kunne ikke opdatere adgangskoden. Prøv igen.' }
  }

  cookieStore.delete(RECOVERY_COOKIE)
  redirect('/login?reset=1')
}
