import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CuratorGate from './CuratorGate'
import PasteUrlUI from './PasteUrlUI'
import SettingsUI, { type KeywordRow } from './settings/SettingsUI'
import YayListUI, { type YayChannel, type YayVideo, type NayVideo, type SubscribedList } from './YayListUI'
import SharedHeader from '@/components/shared/SharedHeader'
import { lockCurator } from './actions'
import { Lock, LockOpen, Timer } from 'lucide-react'

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

  // Stat counts
  const channelCount = (yayChannels ?? []).length
  const videoCount = (yayVideos ?? []).length
  const subCount = subscribedLists.length

  const profileInitial = profileName?.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between shrink-0 sticky top-0 z-10"
        style={{ height: 64, backgroundColor: '#1a1a1a', paddingLeft: 24, paddingRight: 24 }}
      >
        {/* Logo */}
        <Link href="/" aria-label="Gå til feed">
          <img
            src="/yay-logo-compact.svg"
            alt="YAY!"
            className="h-8 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </Link>

        {/* Right actions */}
        <div className="flex items-center" style={{ gap: 8 }}>
          <Link href="/curator/timer" aria-label="Timer" className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/10 transition-colors">
            <Timer size={18} color="white" />
          </Link>
          <form action={lockCurator} style={{ display: 'inline' }}>
            <button type="submit" aria-label={unlocked ? 'Lås' : 'Lås op'} className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/10 transition-colors">
              {unlocked ? <LockOpen size={18} color="white" /> : <Lock size={18} color="white" />}
            </button>
          </form>
          {profileInitial && (
            <Link href="/curator/profiles">
              <div
                className="flex items-center justify-center font-semibold"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#3C3489',
                  color: '#CECBF6',
                  fontSize: 14,
                }}
              >
                {profileInitial}
              </div>
            </Link>
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside
          className="flex flex-col shrink-0 sticky overflow-y-auto"
          style={{
            width: 220,
            backgroundColor: '#f9f9f9',
            borderRight: '1px solid #e5e5e5',
            top: 64,
            height: 'calc(100vh - 64px)',
          }}
        >
          {/* Nav */}
          <nav className="flex-1" style={{ paddingTop: 24, paddingLeft: 20, paddingRight: 20 }}>
            {/* INDHOLD */}
            <p
              style={{
                fontSize: 11,
                color: '#999',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Indhold
            </p>
            <div className="flex flex-col" style={{ gap: 2 }}>
              <Link
                href="/curator"
                style={{
                  fontSize: 14,
                  color: '#1a1a1a',
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: '#eeeeee',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'block',
                }}
              >
                Oversigt
              </Link>
              <Link
                href="/library"
                style={{
                  fontSize: 14,
                  color: '#444',
                  padding: '8px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  display: 'block',
                }}
              >
                Bibliotek
              </Link>
            </div>

            {/* INDSTILLINGER */}
            <p
              style={{
                fontSize: 11,
                color: '#999',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
                marginBottom: 8,
                marginTop: 24,
              }}
            >
              Indstillinger
            </p>
            <div className="flex flex-col" style={{ gap: 2 }}>
              <Link
                href="/curator/profiles"
                style={{
                  fontSize: 14,
                  color: '#444',
                  padding: '8px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  display: 'block',
                }}
              >
                Profiler
              </Link>
              <Link
                href="/curator/account"
                style={{
                  fontSize: 14,
                  color: '#444',
                  padding: '8px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  display: 'block',
                }}
              >
                Konto
              </Link>
            </div>
          </nav>

          {/* Lock link at bottom */}
          <div style={{ padding: '16px 20px' }}>
            <form action={lockCurator}>
              <button
                type="submit"
                style={{
                  color: '#999',
                  fontSize: 13,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Lås
              </button>
            </form>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main className="flex-1" style={{ backgroundColor: '#f5f5f5' }}>
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

          {/* Heading */}
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

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Kanaler</p>
              <p className="text-2xl font-bold text-gray-900">{channelCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Videoer</p>
              <p className="text-2xl font-bold text-gray-900">{videoCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Abonnementer</p>
              <p className="text-2xl font-bold text-gray-900">{subCount}</p>
            </div>
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

      </div>
    </div>
  )
}
