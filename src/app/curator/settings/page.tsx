import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SharedHeader from '@/components/shared/SharedHeader'
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
    <main className="min-h-screen bg-gray-50">
      <SharedHeader style={{ zIndex: 100 }} />
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

        <h1 className="text-xl font-bold text-gray-900 mb-6">Indstillinger</h1>

        <SettingsUI initialKeywords={keywords} />
      </div>
    </main>
  )
}
