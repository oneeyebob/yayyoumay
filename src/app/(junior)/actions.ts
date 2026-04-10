'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function createProfile(
  name: string,
  avatarColor: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind.' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, name: name.trim(), avatar_color: avatarColor })
    .select('id')
    .single()

  if (profileError || !profile) return { error: 'Kunne ikke oprette profil.' }

  const adminClient = createAdminClient()
  const { error: listError } = await adminClient
    .from('lists')
    .insert({ profile_id: profile.id, name: name.trim() })

  if (listError) {
    console.error('[createProfile] liste-oprettelse fejlede:', listError)
    return { error: 'Profil oprettet, men liste fejlede.' }
  }

  return { error: null }
}
