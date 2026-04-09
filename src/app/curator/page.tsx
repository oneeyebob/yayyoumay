import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SharedHeader from '@/components/shared/SharedHeader'
import CuratorGate from './CuratorGate'
import PasteUrlUI from './PasteUrlUI'
import SettingsUI, { type KeywordRow } from './settings/SettingsUI'
import YayListUI, { type YayChannel, type YayVideo, type NayVideo } from './YayListUI'

export default async function CuratorPage() {
  const cookieStore = await cookies()
  const unlocked = cookieStore.get('curator_unlocked')?.value === 'true'

  if (!unlocked) {
    return <CuratorGate />
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Show the active profile's name (the profile currently selected in the
  // family picker), so the curator knows whose list they're curating.
  const activeProfileId = cookieStore.get('active_profile_id')?.value ?? null

  let profileName: string | null = null

  if (user && activeProfileId) {
    const { data: activeProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', activeProfileId)
      .eq('user_id', user.id) // ownership check
      .single()
    profileName = activeProfile?.name ?? null
  }

  // Load active profile's list id
  let listId: string | null = null

  if (activeProfileId) {
    const { data: list } = await supabase
      .from('lists')
      .select('id')
      .eq('profile_id', activeProfileId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (list) {
      listId = list.id
    }
  }

  // Load keyword blacklist
  const { data: keywordRows } = await supabase
    .from('keyword_blacklist')
    .select('id, keyword')
    .order('created_at', { ascending: true })
  const keywords: KeywordRow[] = keywordRows ?? []

  // Yay'd channels
  const { data: yayChannels } = listId ? await supabase
    .from('list_items')
    .select('id, channels(id, name, thumbnail_url)')
    .eq('list_id', listId)
    .eq('status', 'yay')
    .not('channel_id', 'is', null)
    .order('created_at', { ascending: false }) : { data: [] }

  // Yay'd videos
  const { data: yayVideos } = listId ? await supabase
    .from('list_items')
    .select('id, videos(id, title, thumbnail_url)')
    .eq('list_id', listId)
    .eq('status', 'yay')
    .not('video_id', 'is', null)
    .order('created_at', { ascending: false }) : { data: [] }

  // Nay'd (blocked) videos
  const { data: nayVideos } = listId ? await supabase
    .from('list_items')
    .select('id, videos(id, title, thumbnail_url)')
    .eq('list_id', listId)
    .eq('status', 'nay')
    .not('video_id', 'is', null)
    .order('created_at', { ascending: false }) : { data: [] }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Sticky header */}
      <SharedHeader
        showAvatar={!!profileName}
        profileInitial={profileName?.charAt(0).toUpperCase()}
        avatarHref="/curator/profiles"
        showLockButton={true}
      />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Greeting */}
        <div>
          {profileName ? (
            <h1 className="text-xl font-bold text-gray-900">Hej {profileName}</h1>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900">Hej 👋</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                <Link href="/" className="underline hover:text-gray-600">
                  Vælg en profil
                </Link>{' '}
                for at kuratere
              </p>
            </>
          )}
        </div>

        {/* Paste URL */}
        {listId && <PasteUrlUI listId={listId} />}

        <hr className="border-t border-gray-200" />

        {/* Settings: keyword blacklist + ads info */}
        <SettingsUI initialKeywords={keywords} />

        {/* Yay'd content list */}
        <YayListUI
          yayChannels={(yayChannels ?? []) as YayChannel[]}
          yayVideos={(yayVideos ?? []) as YayVideo[]}
          nayVideos={(nayVideos ?? []) as NayVideo[]}
        />

      </div>
    </main>
  )
}
