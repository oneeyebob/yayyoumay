import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsUI, { type KeywordRow } from './SettingsUI'

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const unlocked = cookieStore.get('curator_unlocked')?.value === 'true'
  if (!unlocked) redirect('/curator')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load keyword blacklist
  const { data: keywordRows } = await supabase
    .from('keyword_blacklist')
    .select('id, keyword')
    .order('created_at', { ascending: true })

  const keywords: KeywordRow[] = keywordRows ?? []

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Indstillinger</h1>
      <SettingsUI initialKeywords={keywords} />
    </div>
  )
}
