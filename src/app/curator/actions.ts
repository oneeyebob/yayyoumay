'use server'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOrCreateDefaultList(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ id: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // First profile for this user (curator's own profile)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!profile) return null

  // First list for that profile — create one if it doesn't exist
  const { data: existingList } = await supabase
    .from('lists')
    .select('id')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (existingList) return existingList

  const { data: newList } = await supabase
    .from('lists')
    .insert({ profile_id: profile.id, name: 'Min liste' })
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
}

export async function yayNayAction(
  params: YayNayParams
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const list = await getOrCreateDefaultList(supabase)
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
