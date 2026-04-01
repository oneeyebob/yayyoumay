import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CuratorGate from './CuratorGate'
import SearchUI from './SearchUI'

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

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" aria-label="Gå til feed">
          <img
            src="/yay-logo.svg"
            alt="YAY!"
            className="h-20 w-auto transition-[filter] duration-200 hover:[filter:brightness(0)_saturate(100%)_invert(16%)_sepia(100%)_saturate(7481%)_hue-rotate(1deg)_brightness(103%)_contrast(104%)] active:[filter:brightness(0)_saturate(100%)_invert(10%)_sepia(100%)_saturate(9999%)_hue-rotate(1deg)_brightness(90%)]"
          />
        </Link>
        <span className="text-sm text-gray-400">Kuratormode</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Greeting */}
        <div>
          {profileName ? (
            <>
              <h1 className="text-xl font-bold text-gray-900">Hej {profileName} 👋</h1>
              <p className="text-xs text-gray-400 mt-0.5">Kuratormode</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900">Hej 👋</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Kuratormode ·{' '}
                <Link href="/" className="underline hover:text-gray-600">
                  Vælg en profil
                </Link>{' '}
                for at kuratere
              </p>
            </>
          )}
        </div>

        {/* Browse mode shortcut */}
        <Link
          href="/curator/browse"
          className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 shadow-sm px-4 py-3.5 hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <span className="text-2xl" aria-hidden>📺</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Browse tilstand</p>
            <p className="text-xs text-gray-400 truncate">Søg og godkend indhold sammen</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="ml-auto shrink-0 w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" aria-hidden>
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </Link>

        {/* Settings shortcut */}
        <Link
          href="/curator/settings"
          className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 shadow-sm px-4 py-3.5 hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <span className="text-2xl" aria-hidden>⚙️</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Indstillinger</p>
            <p className="text-xs text-gray-400 truncate">Ordfilter, YouTube Premium</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="ml-auto shrink-0 w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" aria-hidden>
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </Link>

        {/* Search + results */}
        <SearchUI />

      </div>
    </main>
  )
}
