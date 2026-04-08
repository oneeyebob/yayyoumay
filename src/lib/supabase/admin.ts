import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local — never expose this to the client.
// Used only in server actions that need admin privileges (e.g. password reset).
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
