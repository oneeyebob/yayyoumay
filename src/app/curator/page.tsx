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
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Header */}
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

        {/* Search + results */}
        <SearchUI />

      </div>
    </main>
  )
}
