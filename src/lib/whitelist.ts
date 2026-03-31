// Whitelist helpers — functions for checking whether a video or channel
// is approved for the current user's junior profiles.
// RLS on list_items already scopes queries to the authenticated user,
// so these functions only need a server Supabase client with a valid session.

import { createClient } from '@/lib/supabase/server'

/**
 * Returns true if a video should be shown in the junior feed.
 *
 * Priority order:
 *  1. Explicit 'nay' on the video  → false  (nay always wins)
 *  2. Explicit 'yay' on the video  → true
 *  3. 'yay' on the video's channel → true   (channel approval = all videos approved)
 *  4. Otherwise                    → false
 *
 * RLS on list_items scopes checks to the authenticated user's profiles.
 */
export async function isVideoWhitelisted(
  ytVideoId: string,
  // userId is accepted for clarity / future explicit filtering,
  // but RLS on list_items already enforces the user boundary.
  _userId: string
): Promise<boolean> {
  const supabase = await createClient()

  // Step 1: resolve yt_video_id → internal id + channel_id
  const { data: video } = await supabase
    .from('videos')
    .select('id, channel_id')
    .eq('yt_video_id', ytVideoId)
    .single()

  if (!video) return false

  // Step 2: explicit nay on this video — always blocks, even if channel is yay'd
  const { count: nayCount } = await supabase
    .from('list_items')
    .select('id', { count: 'exact', head: true })
    .eq('video_id', video.id)
    .eq('status', 'nay')

  if ((nayCount ?? 0) > 0) return false

  // Step 3: explicit yay on this video
  const { count: videoYayCount } = await supabase
    .from('list_items')
    .select('id', { count: 'exact', head: true })
    .eq('video_id', video.id)
    .eq('status', 'yay')

  if ((videoYayCount ?? 0) > 0) return true

  // Step 4: yay on the video's parent channel (channel approval = all videos approved)
  const { count: channelYayCount } = await supabase
    .from('list_items')
    .select('id', { count: 'exact', head: true })
    .eq('channel_id', video.channel_id)
    .eq('status', 'yay')

  return (channelYayCount ?? 0) > 0
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
