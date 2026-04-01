import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BrowseUI from './BrowseUI'

export default async function BrowsePage() {
  const cookieStore = await cookies()
  const unlocked = cookieStore.get('curator_unlocked')?.value === 'true'

  // Require the curator PIN gate before browsing
  if (!unlocked) redirect('/curator')

  return <BrowseUI />
}
