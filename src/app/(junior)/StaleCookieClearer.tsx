'use client'

import { useEffect } from 'react'
import { clearProfile } from './actions'

// Rendered when active_profile_id cookie is set but doesn't belong to the
// current user. Silently deletes the stale cookie so it doesn't linger.
export default function StaleCookieClearer() {
  useEffect(() => {
    clearProfile()
  }, [])

  return null
}
