import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CuratorGate from './CuratorGate'

export default async function CuratorPage() {
  const cookieStore = await cookies()
  const unlocked = cookieStore.get('curator_unlocked')?.value === 'true'

  if (!unlocked) {
    return <CuratorGate />
  }

  // Fetch the curator's display name from their first profile
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
    : { data: null }

  const username = profile?.name ?? 'Kurator'

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8">

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hej {username} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Hvad vil du gøre i dag?</p>
        </div>

        {/* Search bar — UI only */}
        <div>
          <input
            type="search"
            placeholder="Søg efter kanaler eller videoer…"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
        </div>

        {/* Nav cards */}
        <div className="grid grid-cols-1 gap-4">
          <Link
            href="/curator/profiles"
            className="flex items-center gap-4 rounded-xl bg-white border border-gray-200 px-5 py-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
          >
            <span className="text-2xl">👤</span>
            <div>
              <p className="font-semibold text-gray-900">Profiler</p>
              <p className="text-sm text-gray-500">Administrer profiler i husstanden</p>
            </div>
          </Link>

          <Link
            href="/curator/lists"
            className="flex items-center gap-4 rounded-xl bg-white border border-gray-200 px-5 py-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-semibold text-gray-900">Lister</p>
              <p className="text-sm text-gray-500">Godkendte og afviste kanaler og videoer</p>
            </div>
          </Link>

          <Link
            href="/curator/community"
            className="flex items-center gap-4 rounded-xl bg-white border border-gray-200 px-5 py-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
          >
            <span className="text-2xl">🌍</span>
            <div>
              <p className="font-semibold text-gray-900">Community</p>
              <p className="text-sm text-gray-500">Udforsk og importer lister fra andre</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}
