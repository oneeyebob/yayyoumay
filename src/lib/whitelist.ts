// Whitelist helpers — functions for checking whether a video or channel
// is approved for the current user's junior profiles.
// RLS on list_items already scopes queries to the authenticated user,
// so these functions only need a server Supabase client with a valid session.

import { createClient } from '@/lib/supabase/server'

/**
 * Returns true if ANY of the authenticated user's profiles has a
 * yay'd list_item pointing to the given YouTube video ID.
 */
export async function isVideoWhitelisted(
  ytVideoId: string,
  // userId is accepted for clarity / future explicit filtering,
  // but RLS on list_items already enforces the user boundary.
  _userId: string
): Promise<boolean> {
  const supabase = await createClient()

  // Step 1: resolve yt_video_id → internal id
  const { data: video } = await supabase
    .from('videos')
    .select('id')
    .eq('yt_video_id', ytVideoId)
    .single()

  if (!video) return false

  // Step 2: check for a yay'd list_item (RLS scopes to current user)
  const { count } = await supabase
    .from('list_items')
    .select('id', { count: 'exact', head: true })
    .eq('video_id', video.id)
    .eq('status', 'yay')

  return (count ?? 0) > 0
}

/**
 * Returns true if ANY of the authenticated user's profiles has a
 * yay'd list_item pointing to the given YouTube channel ID.
 */
export async function isChannelWhitelisted(
  ytChannelId: string,
  _userId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data: channel } = await supabase
    .from('channels')
    .select('id')
    .eq('yt_channel_id', ytChannelId)
    .single()

  if (!channel) return false

  const { count } = await supabase
    .from('list_items')
    .select('id', { count: 'exact', head: true })
    .eq('channel_id', channel.id)
    .eq('status', 'yay')

  return (count ?? 0) > 0
}
