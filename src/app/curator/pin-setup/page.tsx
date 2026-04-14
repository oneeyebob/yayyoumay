import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PinSetupForm from './PinSetupForm'

export default async function PinSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const pinReset = cookieStore.get('pin_reset')?.value === 'true'

  // Check whether the user already has a PIN
  const { data: settings } = await supabase
    .from('user_settings')
    .select('curator_pin_hash')
    .eq('user_id', user.id)
    .single()

  const hasPin = !!settings?.curator_pin_hash

  // Block access if user already has a PIN and didn't arrive via reset flow
  if (hasPin && !pinReset) redirect('/curator')

  return <PinSetupForm />
}
