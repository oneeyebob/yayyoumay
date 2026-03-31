'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// Clears the active profile selection and goes to the profile picker (/).
export async function goHomeAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('active_profile_id')
  redirect('/')
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Clear the junior profile selection so the next session starts fresh
  const cookieStore = await cookies()
  cookieStore.delete('active_profile_id')

  redirect('/login')
}
