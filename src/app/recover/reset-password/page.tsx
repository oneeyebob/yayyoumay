import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ResetPasswordClient from './ResetPasswordClient'

export default async function ResetPasswordPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('recovery_token')?.value

  if (!token) {
    redirect('/recover')
  }

  return <ResetPasswordClient />
}
