import { cookies } from 'next/headers'
import TimerGuard from '@/components/shared/TimerGuard'

export default async function JuniorLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const profileId = cookieStore.get('active_profile_id')?.value ?? null

  return (
    <>
      {children}
      {profileId && <TimerGuard profileId={profileId} />}
    </>
  )
}
