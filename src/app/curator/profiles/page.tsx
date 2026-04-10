import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SharedHeader from '@/components/shared/SharedHeader'
import ProfilesUI, { type ProfileRow } from './ProfilesUI'

export default async function ProfilesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Load profiles with list counts
  const { data: rawProfiles } = await supabase
    .from('profiles')
    .select(`
      id, name, avatar_color,
      lists(id)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const profiles: ProfileRow[] = (rawProfiles ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    avatar_color: p.avatar_color,
    listCount: Array.isArray(p.lists) ? p.lists.length : 0,
  }))

  return (
    <main className="min-h-screen bg-gray-50">
      <SharedHeader showLockButton={true} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/curator"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Kuratormode
        </Link>

        <ProfilesUI profiles={profiles} />
      </div>
    </main>
  )
}
