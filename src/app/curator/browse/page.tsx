import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BrowseUI from './BrowseUI'

export default async function BrowsePage() {
  const cookieStore = await cookies()
  const unlocked = cookieStore.get('curator_unlocked')?.value === 'true'

  if (!unlocked) redirect('/curator')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profileName: string | null = null
  let langFilter: string | null = null

  const activeProfileId = cookieStore.get('active_profile_id')?.value ?? null
  if (user && activeProfileId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', activeProfileId)
      .eq('user_id', user.id)
      .single()
    profileName = profile?.name ?? null

    const { data: list } = await supabase
      .from('lists')
      .select('lang_filter')
      .eq('profile_id', activeProfileId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    langFilter = list?.lang_filter ?? null
  }

  return <BrowseUI profileName={profileName} langFilter={langFilter} />
}
