'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { searchYouTube, getVideo, getChannel, getPopularVideosForLanguages } from '@/lib/youtube/client'
import type { YouTubeSearchResponse } from '@/lib/youtube/types'

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchAction(
  query: string,
  options?: { language?: string }
): Promise<YouTubeSearchResponse> {
  return searchYouTube(query, { maxResults: 20, ...options })
}

// ── Lists (for yay picker) ────────────────────────────────────────────────────

export interface ListOption {
  id: string
  name: string
  profileName: string
}

export async function getLists(): Promise<ListOption[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (!profiles?.length) return []

  const profileMap = new Map(profiles.map((p) => [p.id, p.name]))
  const profileIds = profiles.map((p) => p.id)

  const { data: lists } = await supabase
    .from('lists')
    .select('id, name, profile_id')
    .in('profile_id', profileIds)
    .order('created_at', { ascending: true })

  return (lists ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    profileName: profileMap.get(l.profile_id) ?? '—',
  }))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Returns the list for the active profile (from cookie), falling back to
// the user's first profile if no cookie is set or the cookie is stale.
async function getListForActiveProfile(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ id: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Prefer the profile the family has selected via the picker
  const cookieStore = await cookies()
  const activeProfileId = cookieStore.get('active_profile_id')?.value ?? null

  let profileId: string | null = null

  if (activeProfileId) {
    // Validate the cookie profile actually belongs to this user
    const { data: activeProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', activeProfileId)
      .eq('user_id', user.id)
      .single()
    if (activeProfile) profileId = activeProfile.id
  }

  if (!profileId) {
    // Fallback: first profile for this user
    const { data: firstProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (!firstProfile) return null
    profileId = firstProfile.id
  }

  // Get or auto-create list for this profile
  const { data: existingList } = await supabase
    .from('lists')
    .select('id')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (existingList) return existingList

  const { data: newList } = await supabase
    .from('lists')
    .insert({ profile_id: profileId, name: 'Min liste' })
    .select('id')
    .single()

  return newList
}

async function upsertChannel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ytChannelId: string,
  name: string,
  thumbnailUrl?: string
): Promise<{ id: string } | null> {
  // Try to fetch existing channel first
  const { data: existing } = await supabase
    .from('channels')
    .select('id')
    .eq('yt_channel_id', ytChannelId)
    .single()

  if (existing) return existing

  const { data: inserted } = await supabase
    .from('channels')
    .insert({ yt_channel_id: ytChannelId, name, thumbnail_url: thumbnailUrl ?? null })
    .select('id')
    .single()

  return inserted
}

async function upsertVideo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ytVideoId: string,
  channelDbId: string,
  title: string,
  thumbnailUrl?: string
): Promise<{ id: string } | null> {
  const { data: existing } = await supabase
    .from('videos')
    .select('id')
    .eq('yt_video_id', ytVideoId)
    .single()

  if (existing) return existing

  const { data: inserted } = await supabase
    .from('videos')
    .insert({
      yt_video_id: ytVideoId,
      channel_id: channelDbId,
      title,
      thumbnail_url: thumbnailUrl ?? null,
    })
    .select('id')
    .single()

  return inserted
}

// ── Yay / Nay ────────────────────────────────────────────────────────────────

export interface YayNayParams {
  type: 'channel' | 'video'
  ytId: string
  ytTitle: string
  ytThumbnail: string
  channelId?: string    // YouTube channel ID — required for videos
  channelTitle?: string // required for videos so we can populate channels table
  status: 'yay' | 'nay'
  listId?: string       // explicit list — if omitted falls back to default/auto-create
}

export async function yayNayAction(
  params: YayNayParams
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let list: { id: string } | null = null

  if (params.listId) {
    list = { id: params.listId }
  } else {
    list = await getListForActiveProfile(supabase)
  }

  if (!list) return { error: 'Kunne ikke finde eller oprette en liste.' }

  if (params.type === 'channel') {
    const channel = await upsertChannel(
      supabase,
      params.ytId,
      params.ytTitle,
      params.ytThumbnail
    )
    if (!channel) return { error: 'Kunne ikke gemme kanal.' }

    // Check if a list_item for this channel already exists in this list
    const { data: existing } = await supabase
      .from('list_items')
      .select('id')
      .eq('list_id', list.id)
      .eq('channel_id', channel.id)
      .is('video_id', null)
      .single()

    if (existing) {
      await supabase
        .from('list_items')
        .update({ status: params.status })
        .eq('id', existing.id)
    } else {
      const { error } = await supabase.from('list_items').insert({
        list_id: list.id,
        channel_id: channel.id,
        video_id: null,
        status: params.status,
      })
      if (error) return { error: 'Kunne ikke gemme til listen.' }
    }
  } else {
    if (!params.channelId) return { error: 'channelId kræves for videoer.' }

    const channel = await upsertChannel(
      supabase,
      params.channelId,
      params.channelTitle ?? params.channelId
    )
    if (!channel) return { error: 'Kunne ikke gemme kanal.' }

    const video = await upsertVideo(
      supabase,
      params.ytId,
      channel.id,
      params.ytTitle,
      params.ytThumbnail
    )
    if (!video) return { error: 'Kunne ikke gemme video.' }

    const { data: existing } = await supabase
      .from('list_items')
      .select('id')
      .eq('list_id', list.id)
      .eq('video_id', video.id)
      .is('channel_id', null)
      .single()

    if (existing) {
      await supabase
        .from('list_items')
        .update({ status: params.status })
        .eq('id', existing.id)
    } else {
      const { error } = await supabase.from('list_items').insert({
        list_id: list.id,
        video_id: video.id,
        channel_id: null,
        status: params.status,
      })
      if (error) return { error: 'Kunne ikke gemme til listen.' }
    }
  }

  return { error: null }
}

// ── Keyword blacklist ─────────────────────────────────────────────────────────

/**
 * Returns all blacklisted keywords for the current user, ordered by creation
 * date. Used by SearchUI and BrowseUI to filter results client-side.
 */
export async function getKeywords(): Promise<Array<{ id: string; keyword: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('keyword_blacklist')
    .select('id, keyword')
    .order('created_at', { ascending: true })

  return data ?? []
}

// ── Browse: fetch existing decisions ─────────────────────────────────────────

/**
 * Given a list of YouTube IDs from search results, returns which ones the
 * active profile has already decided on (yay/nay) in their list.
 */
export async function getDecisions(
  items: Array<{ kind: 'video' | 'channel'; ytId: string }>
): Promise<Record<string, 'yay' | 'nay'>> {
  const supabase = await createClient()
  const result: Record<string, 'yay' | 'nay'> = {}

  const list = await getListForActiveProfile(supabase)
  if (!list) return result

  const videoYtIds = items.filter((i) => i.kind === 'video').map((i) => i.ytId)
  const channelYtIds = items.filter((i) => i.kind === 'channel').map((i) => i.ytId)

  // Videos
  if (videoYtIds.length > 0) {
    const { data: videos } = await supabase
      .from('videos')
      .select('id, yt_video_id')
      .in('yt_video_id', videoYtIds)

    if (videos?.length) {
      const { data: listItems } = await supabase
        .from('list_items')
        .select('video_id, status')
        .eq('list_id', list.id)
        .in('video_id', videos.map((v) => v.id))
        .is('channel_id', null)

      const ytIdByInternalId = new Map(videos.map((v) => [v.id, v.yt_video_id]))
      for (const li of listItems ?? []) {
        if (li.video_id) {
          const ytId = ytIdByInternalId.get(li.video_id)
          if (ytId) result[ytId] = li.status as 'yay' | 'nay'
        }
      }
    }
  }

  // Channels
  if (channelYtIds.length > 0) {
    const { data: channels } = await supabase
      .from('channels')
      .select('id, yt_channel_id')
      .in('yt_channel_id', channelYtIds)

    if (channels?.length) {
      const { data: listItems } = await supabase
        .from('list_items')
        .select('channel_id, status')
        .eq('list_id', list.id)
        .in('channel_id', channels.map((c) => c.id))
        .is('video_id', null)

      const ytIdByInternalId = new Map(channels.map((c) => [c.id, c.yt_channel_id]))
      for (const li of listItems ?? []) {
        if (li.channel_id) {
          const ytId = ytIdByInternalId.get(li.channel_id)
          if (ytId) result[ytId] = li.status as 'yay' | 'nay'
        }
      }
    }
  }

  return result
}

// ── Remove list item ─────────────────────────────────────────────────────────

export async function removeListItem(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // Fetch the item first to get list_id and channel_id
  const { data: item, error: fetchError } = await supabase
    .from('list_items')
    .select('list_id, channel_id')
    .eq('id', id)
    .single()

  if (fetchError || !item) return { error: fetchError?.message ?? 'Item ikke fundet.' }

  // Delete the item itself
  const { error } = await supabase.from('list_items').delete().eq('id', id)
  if (error) return { error: error.message }

  // If it was a channel item, also remove all video items from the same channel in this list
  if (item.channel_id) {
    const { data: videos } = await supabase
      .from('videos')
      .select('id')
      .eq('channel_id', item.channel_id)

    if (videos && videos.length > 0) {
      const videoIds = videos.map((v) => v.id)
      await supabase
        .from('list_items')
        .delete()
        .eq('list_id', item.list_id)
        .in('video_id', videoIds)
    }
  }

  return { error: null }
}

// ── List filters ──────────────────────────────────────────────────────────────

export async function updateListFilters(
  listId: string,
  langFilter: string | null,
  ageFilter: string | null
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke logget ind.' }

  const { error } = await supabase
    .from('lists')
    .update({ lang_filter: langFilter, age_filter: ageFilter })
    .eq('id', listId)

  return error ? { error: error.message } : { error: null }
}

// ── Browse: yay from embed ─────────────────────────────────────────────────────

export async function yayVideoFromEmbed(
  videoId: string
): Promise<{ error: string | null }> {
  try {
    const video = await getVideo(videoId)
    return yayNayAction({
      type: 'video',
      ytId: video.id,
      ytTitle: video.title,
      ytThumbnail: video.thumbnail.url,
      channelId: video.channelId,
      channelTitle: video.channelTitle,
      status: 'yay',
    })
  } catch {
    return { error: 'Kunne ikke hente videoinfo.' }
  }
}

export async function yayChannelFromEmbed(
  videoId: string
): Promise<{ error: string | null }> {
  try {
    const video = await getVideo(videoId)
    const channel = await getChannel(video.channelId)
    return yayNayAction({
      type: 'channel',
      ytId: channel.id,
      ytTitle: channel.title,
      ytThumbnail: channel.thumbnail.url,
      status: 'yay',
    })
  } catch {
    return { error: 'Kunne ikke hente kanalinfo.' }
  }
}

export async function getPopularVideosAction(
  langFilter: string | null
): Promise<import('@/lib/youtube/types').YouTubeSearchResult[]> {
  const langs = langFilter
    ? langFilter.split(',').map((l) => l.trim()).filter(Boolean)
    : []
  try {
    return await getPopularVideosForLanguages(langs, 24)
  } catch {
    return []
  }
}
