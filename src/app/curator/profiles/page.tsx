import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ProfilesUI profiles={profiles} />
    </div>
  )
}
