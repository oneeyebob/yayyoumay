'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function createProfile(params: {
  name: string
  avatarColor: string
}): Promise<{ error: string | null; firstProfile: boolean }> {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Ikke logget ind.', firstProfile: false }

  // Check whether this is the user's very first profile so the UI can
  // redirect them to /curator/pin-setup to complete onboarding.
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const firstProfile = count === 0

  const { error } = await supabase.from('profiles').insert({
    user_id: userId,
    name: params.name.trim(),
    avatar_color: params.avatarColor,
  })

  if (error) return { error: 'Kunne ikke oprette profil.', firstProfile: false }

  revalidatePath('/curator/profiles')
  return { error: null, firstProfile }
}

export async function updateProfile(params: {
  id: string
  name: string
  avatarColor: string
}): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ name: params.name.trim(), avatar_color: params.avatarColor })
    .eq('id', params.id)

  if (error) return { error: 'Kunne ikke opdatere profil.' }

  revalidatePath('/curator/profiles')
  return { error: null }
}

export async function deleteProfile(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)

  if (error) return { error: 'Kunne ikke slette profil.' }

  revalidatePath('/curator/profiles')
  return { error: null }
}
