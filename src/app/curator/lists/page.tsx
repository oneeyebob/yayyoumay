import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ListsUI, { type ListRow, type ProfileOption } from './ListsUI'

export default async function ListsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Load profiles for this user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const profileOptions: ProfileOption[] = profiles ?? []
  const profileIds = profileOptions.map((p) => p.id)
  const profileMap = new Map(profileOptions.map((p) => [p.id, p.name]))

  // Load all lists for those profiles, with their items
  let lists: ListRow[] = []

  if (profileIds.length > 0) {
    const { data: rawLists } = await supabase
      .from('lists')
      .select(`
        id, name, description, lang_filter, profile_id,
        list_items(status)
      `)
      .in('profile_id', profileIds)
      .order('created_at', { ascending: false })

    lists = (rawLists ?? []).map((l) => {
      const items = Array.isArray(l.list_items) ? l.list_items : []
      return {
        id: l.id,
        name: l.name,
        description: l.description,
        lang_filter: l.lang_filter,
        profile_id: l.profile_id,
        profileName: profileMap.get(l.profile_id) ?? '—',
        yayCount: items.filter((i: { status: string }) => i.status === 'yay').length,
      }
    })
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/curator"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Kuratormode
        </Link>

        <ListsUI lists={lists} profiles={profileOptions} />
      </div>
    </main>
  )
}
