'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { searchYouTube } from '@/lib/youtube/client'
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
