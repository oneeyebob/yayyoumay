import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AccountUI from './AccountUI'

export default async function AccountPage() {
  const cookieStore = await cookies()
  const unlocked = cookieStore.get('curator_unlocked')?.value === 'true'
  if (!unlocked) redirect('/curator')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Konto</h1>
      <AccountUI />
    </div>
  )
}
