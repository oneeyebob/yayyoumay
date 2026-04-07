import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPopularVideosForLanguages } from '@/lib/youtube/client'
import type { YouTubeSearchResult } from '@/lib/youtube/types'
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

    // Load the active profile's list to get lang_filter
    const { data: list } = await supabase
      .from('lists')
      .select('lang_filter')
      .eq('profile_id', activeProfileId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    langFilter = list?.lang_filter ?? null
  }

  const langCodes = langFilter
    ? langFilter.split(',').map((l) => l.trim()).filter(Boolean)
    : []

  console.log('[BrowsePage] calling getPopularVideosForLanguages, langCodes:', langCodes)
  const initialVideos: YouTubeSearchResult[] = await getPopularVideosForLanguages(langCodes, 24)
  console.log('[BrowsePage] result count:', initialVideos.length)

  return <BrowseUI profileName={profileName} initialVideos={initialVideos} langFilter={langFilter} />
}
