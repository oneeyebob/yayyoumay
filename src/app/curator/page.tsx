import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SharedHeader from '@/components/shared/SharedHeader'
import CuratorGate from './CuratorGate'
import PasteUrlUI from './PasteUrlUI'
import SettingsUI, { type KeywordRow } from './settings/SettingsUI'
import YayListUI, { type YayChannel, type YayVideo, type NayVideo, type SubscribedList } from './YayListUI'

export default async function CuratorPage() {
  const cookieStore = await cookies()
  const unlocked = cookieStore.get('curator_unlocked')?.value === 'true'

  if (!unlocked) {
    return (
      <>
        <SharedHeader style={{ zIndex: 100 }} />
        <CuratorGate />
      </>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Show the active profile's name (the profile currently selected in the
  // family picker), so the curator knows whose list they're curating.
  const activeProfileId = cookieStore.get('active_profile_id')?.value ?? null

  // Auto-select first profile if none is active
  if (user && !activeProfileId) {
    redirect('/curator/auto-select')
  }

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

  // Subscribed lists
  let subscribedLists: SubscribedList[] = []
  if (user) {
    const { data: subs } = await supabase
      .from('list_subscriptions' as never)
      .select('list_id')
      .eq('subscriber_user_id', user.id) as { data: { list_id: string }[] | null }

    if (subs && subs.length > 0) {
      const subListIds = subs.map((s) => s.list_id)

      const { data: subListRows } = await supabase
        .from('lists')
        .select('id, name')
        .in('id', subListIds)

      subscribedLists = await Promise.all(
        (subListRows ?? []).map(async (list) => {
          const [{ data: rawChannels }, { data: rawVideos }] = await Promise.all([
            supabase
              .from('list_items')
              .select('id, channel_id, channels(id, name, thumbnail_url)')
              .eq('list_id', list.id)
              .eq('status', 'yay')
              .not('channel_id', 'is', null)
              .order('created_at', { ascending: false }),
            supabase
              .from('list_items')
              .select('id, video_id, videos(id, title, thumbnail_url)')
              .eq('list_id', list.id)
              .eq('status', 'yay')
              .not('video_id', 'is', null)
              .order('created_at', { ascending: false }),
          ])

          type RawCh = { id: string; name: string; thumbnail_url: string | null }
          type RawVid = { id: string; title: string; thumbnail_url: string | null }

          const channels = (rawChannels ?? []).map((item) => {
            const ch = Array.isArray(item.channels) ? item.channels[0] : item.channels
            return {
              itemId: item.id,
              channelId: item.channel_id as string,
              name: (ch as RawCh | null)?.name ?? '—',
              thumbnail_url: (ch as RawCh | null)?.thumbnail_url ?? null,
            }
          })

          const videos = (rawVideos ?? []).map((item) => {
            const v = Array.isArray(item.videos) ? item.videos[0] : item.videos
            return {
              itemId: item.id,
              videoId: item.video_id as string,
              title: (v as RawVid | null)?.title ?? '—',
              thumbnail_url: (v as RawVid | null)?.thumbnail_url ?? null,
            }
          })

          return { id: list.id, name: list.name, channels, videos }
        })
      )
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Sticky header */}
      <SharedHeader
        showAvatar={!!profileName}
        profileInitial={profileName?.charAt(0).toUpperCase()}
        avatarHref="/curator/profiles"
        showLockButton={true}
        showTimerIcon={true}
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
          subscribedLists={subscribedLists}
          ownListId={listId}
        />

      </div>
    </main>
  )
}
