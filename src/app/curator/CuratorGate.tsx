'use client'

import { useRouter } from 'next/navigation'
import PinModal from '@/components/shared/PinModal'

export default function CuratorGate() {
  const router = useRouter()

  function handleSuccess() {
    // Cookie is now set — hard-refresh so the server component re-renders unlocked
    router.refresh()
  }

  return <PinModal isOpen onSuccess={handleSuccess} />
}
