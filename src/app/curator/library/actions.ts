'use server'

import { createClient } from '@/lib/supabase/server'

export async function subscribeToList(listId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Ikke logget ind')

  await supabase
    .from('list_subscriptions' as never)
    .insert({ subscriber_user_id: user.id, list_id: listId } as never)
}

export async function unsubscribeFromList(listId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Ikke logget ind')

  await supabase
    .from('list_subscriptions' as never)
    .delete()
    .eq('subscriber_user_id', user.id)
    .eq('list_id', listId)
}
