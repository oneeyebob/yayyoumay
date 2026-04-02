import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CuratorGate from './CuratorGate'
import SearchUI from './SearchUI'
import FiltersUI from './FiltersUI'
import SettingsUI, { type KeywordRow } from './settings/SettingsUI'

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

  // Load active profile's list filters
  let listId: string | null = null
  let langFilter: string | null = null
  let ageFilter: string | null = null

  if (activeProfileId) {
    const { data: list } = await supabase
      .from('lists')
      .select('id, lang_filter, age_filter')
      .eq('profile_id', activeProfileId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (list) {
      listId = list.id
      langFilter = list.lang_filter ?? null
      ageFilter = list.age_filter ?? null
    }
  }

  // Load keyword blacklist
  const { data: keywordRows } = await supabase
    .from('keyword_blacklist')
    .select('id, keyword')
    .order('created_at', { ascending: true })
  const keywords: KeywordRow[] = keywordRows ?? []

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 relative">
        <Link href="/" aria-label="Gå til feed">
          <img
            src="/yay-logo.svg"
            alt="YAY!"
            className="h-20 w-auto transition-[filter] duration-200 hover:[filter:brightness(0)_saturate(100%)_invert(16%)_sepia(100%)_saturate(7481%)_hue-rotate(1deg)_brightness(103%)_contrast(104%)] active:[filter:brightness(0)_saturate(100%)_invert(10%)_sepia(100%)_saturate(9999%)_hue-rotate(1deg)_brightness(90%)]"
          />
        </Link>
        <span className="text-sm font-normal text-gray-800 absolute left-1/2 -translate-x-1/2">Indstillinger</span>
      </header>

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

        {/* Search + results */}
        <SearchUI />

        <hr className="border-t border-gray-200" />

        {/* Content filters */}
        {listId && (
          <FiltersUI
            listId={listId}
            initialLangFilter={langFilter}
            initialAgeFilter={ageFilter}
          />
        )}

        {/* Settings: keyword blacklist + ads info */}
        <SettingsUI initialKeywords={keywords} />

      </div>
    </main>
  )
}
