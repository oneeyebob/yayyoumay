// YouTube Data API v3 gateway — server-side only.
// All quota usage is logged to the console with a timestamp.

import type {
  YouTubeChannel,
  YouTubeChannelVideosResponse,
  YouTubeSearchResponse,
  YouTubeSearchResult,
  YouTubeThumbnail,
  YouTubeVideo,
} from './types'

const BASE_URL = 'https://www.googleapis.com/youtube/v3'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('[YouTube] YOUTUBE_API_KEY is not set.')
  return key
}

function logCall(endpoint: string, params: Record<string, string>) {
  const ts = new Date().toISOString()
  const summary = Object.entries(params)
    .filter(([k]) => k !== 'key')           // never log the API key
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')
  console.log(`[YouTube] ${ts}  ${endpoint}  ${summary}`)
}

async function ytFetch<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  const key = getApiKey()
  logCall(endpoint, params)

  const url = new URL(`${BASE_URL}/${endpoint}`)
  url.searchParams.set('key', key)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), { next: { revalidate: 60 } })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[YouTube] ${endpoint} failed (${res.status}): ${body}`)
  }

  return res.json() as Promise<T>
}

function bestThumbnail(thumbnails: Record<string, { url: string; width?: number; height?: number }>): YouTubeThumbnail {
  const t = thumbnails.high ?? thumbnails.medium ?? thumbnails.default
  return {
    url: t.url,
    width: t.width ?? 0,
    height: t.height ?? 0,
  }
}

// ISO 8601 duration (PT4M13S) → total seconds
function iso8601ToSeconds(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const h = parseInt(match[1] ?? '0', 10)
  const m = parseInt(match[2] ?? '0', 10)
  const s = parseInt(match[3] ?? '0', 10)
  return h * 3600 + m * 60 + s
}

// ── searchYouTube ─────────────────────────────────────────────────────────────

interface RawSearchItem {
  id: { kind: string; videoId?: string; channelId?: string }
  snippet: {
    title: string
    description: string
    thumbnails: Record<string, { url: string; width?: number; height?: number }>
    channelId: string
    channelTitle: string
    publishedAt?: string
  }
}

interface RawSearchResponse {
  pageInfo: { totalResults: number }
  nextPageToken?: string
  items: RawSearchItem[]
}

export async function searchYouTube(
  query: string,
  options?: { language?: string; maxResults?: number }
): Promise<YouTubeSearchResponse> {
  const maxResults = options?.maxResults ?? 20

  const params: Record<string, string> = {
    part: 'snippet',
    q: query,
    type: 'video,channel',
    maxResults: String(maxResults),
  }
  if (options?.language) params.relevanceLanguage = options.language

  const raw = await ytFetch<RawSearchResponse>('search', params)

  const results: YouTubeSearchResult[] = (raw.items ?? []).map((item) => {
    const isVideo = item.id.kind === 'youtube#video'
    return {
      kind: isVideo ? 'video' : 'channel',
      id: (isVideo ? item.id.videoId : item.id.channelId) ?? '',
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: bestThumbnail(item.snippet.thumbnails),
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt ?? null,
    }
  })

  return {
    results,
    totalResults: raw.pageInfo?.totalResults ?? results.length,
    nextPageToken: raw.nextPageToken ?? null,
    query,
  }
}

// ── getChannel ────────────────────────────────────────────────────────────────

interface RawChannelResponse {
  items: Array<{
    id: string
    snippet: {
      title: string
      description: string
      thumbnails: Record<string, { url: string; width?: number; height?: number }>
      customUrl?: string
      publishedAt?: string
    }
    statistics: {
      subscriberCount?: string
      videoCount?: string
      hiddenSubscriberCount?: boolean
    }
  }>
}

export async function getChannel(channelId: string): Promise<YouTubeChannel> {
  const raw = await ytFetch<RawChannelResponse>('channels', {
    part: 'snippet,statistics',
    id: channelId,
  })

  const item = raw.items?.[0]
  if (!item) throw new Error(`[YouTube] Channel not found: ${channelId}`)

  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: bestThumbnail(item.snippet.thumbnails),
    customUrl: item.snippet.customUrl ?? null,
    subscriberCount: item.statistics.hiddenSubscriberCount
      ? null
      : parseInt(item.statistics.subscriberCount ?? '0', 10),
    videoCount: item.statistics.videoCount
      ? parseInt(item.statistics.videoCount, 10)
      : null,
    publishedAt: item.snippet.publishedAt ?? null,
  }
}

// ── getChannelByHandle ────────────────────────────────────────────────────────

export async function getChannelByHandle(handle: string): Promise<YouTubeChannel> {
  const raw = await ytFetch<RawChannelResponse>('channels', {
    part: 'snippet,statistics',
    forHandle: handle,
  })

  const item = raw.items?.[0]
  if (!item) throw new Error(`[YouTube] Channel not found for handle: ${handle}`)

  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: bestThumbnail(item.snippet.thumbnails),
    customUrl: item.snippet.customUrl ?? null,
    subscriberCount: item.statistics.hiddenSubscriberCount
      ? null
      : parseInt(item.statistics.subscriberCount ?? '0', 10),
    videoCount: item.statistics.videoCount
      ? parseInt(item.statistics.videoCount, 10)
      : null,
    publishedAt: item.snippet.publishedAt ?? null,
  }
}

// ── getVideo ──────────────────────────────────────────────────────────────────

interface RawVideoResponse {
  items: Array<{
    id: string
    snippet: {
      title: string
      description: string
      thumbnails: Record<string, { url: string; width?: number; height?: number }>
      channelId: string
      channelTitle: string
      publishedAt: string
      defaultLanguage?: string
      defaultAudioLanguage?: string
    }
    contentDetails: {
      duration: string
      regionRestriction?: {
        allowed?: string[]
        blocked?: string[]
      }
    }
    status?: {
      embeddable?: boolean
    }
  }>
}

export async function getVideo(videoId: string): Promise<YouTubeVideo> {
  const raw = await ytFetch<RawVideoResponse>('videos', {
    part: 'snippet,contentDetails',
    id: videoId,
  })

  const item = raw.items?.[0]
  if (!item) throw new Error(`[YouTube] Video not found: ${videoId}`)

  const duration = item.contentDetails.duration

  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: bestThumbnail(item.snippet.thumbnails),
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    duration,
    durationSeconds: iso8601ToSeconds(duration),
    publishedAt: item.snippet.publishedAt,
  }
}

// ── getPopularVideosForLanguages ──────────────────────────────────────────────

const NORDIC_SEED_QUERIES = [
  'dansk youtube',
  'danske børn',
  'nordic kids',
  'lego dansk',
  'minecraft dansk',
]

export async function getPopularVideosForLanguages(
  _langCodes: string[],
  maxTotal = 24
): Promise<YouTubeSearchResult[]> {
  const perQuery = Math.ceil(maxTotal / NORDIC_SEED_QUERIES.length)

  const batches = await Promise.all(
    NORDIC_SEED_QUERIES.map((q) =>
      ytFetch<RawSearchResponse>('search', {
        part: 'snippet',
        q,
        type: 'video',
        order: 'viewCount',
        maxResults: String(Math.min(perQuery + 2, 10)),
        relevanceLanguage: 'da',
      }).then((raw) =>
        (raw.items ?? [])
          .filter((item) => item.id.kind === 'youtube#video' && item.id.videoId)
          .map((item) => ({
            kind: 'video' as const,
            id: item.id.videoId!,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: bestThumbnail(item.snippet.thumbnails),
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt ?? null,
          }))
      )
    )
  )

  const seen = new Set<string>()
  const merged: YouTubeSearchResult[] = []
  for (const batch of batches) {
    for (const video of batch) {
      if (!seen.has(video.id)) {
        seen.add(video.id)
        merged.push(video)
      }
    }
  }

  return merged.slice(0, maxTotal)
}

// ── getChannelVideos ──────────────────────────────────────────────────────────

interface RawPlaylistItemsResponse {
  nextPageToken?: string
  items: Array<{
    snippet: {
      resourceId: { videoId: string }
    }
  }>
}

interface RawChannelUploadsResponse {
  items: Array<{
    contentDetails: {
      relatedPlaylists: { uploads: string }
    }
  }>
}

export async function getChannelVideos(
  channelId: string,
  maxResults = 20,
  pageToken?: string
): Promise<YouTubeChannelVideosResponse> {
  // Step 1: get the uploads playlist id for this channel
  const channelRaw = await ytFetch<RawChannelUploadsResponse>('channels', {
    part: 'contentDetails',
    id: channelId,
  })

  const uploadsPlaylistId =
    channelRaw.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsPlaylistId) {
    throw new Error(`[YouTube] Could not find uploads playlist for channel: ${channelId}`)
  }

  // Step 2: list videos from the uploads playlist
  const playlistParams: Record<string, string> = {
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
  }
  if (pageToken) playlistParams.pageToken = pageToken

  const playlistRaw = await ytFetch<RawPlaylistItemsResponse>('playlistItems', playlistParams)

  const videoIds = (playlistRaw.items ?? [])
    .map((item) => item.snippet.resourceId.videoId)
    .filter(Boolean)

  if (videoIds.length === 0) {
    return { channelId, videos: [], nextPageToken: null }
  }

  // Step 3: fetch full video details in a single batch call
  const videosRaw = await ytFetch<RawVideoResponse>('videos', {
    part: 'snippet,contentDetails,status',
    id: videoIds.join(','),
  })

  const videos: YouTubeVideo[] = (videosRaw.items ?? [])
    .filter((item) => {
      // Drop non-embeddable videos (causes YouTube error screen in iframe)
      if (item.status?.embeddable === false) return false
      // Drop videos blocked in Denmark, or only allowed in countries that exclude Denmark
      const rr = item.contentDetails.regionRestriction
      if (rr?.blocked?.includes('DK')) return false
      if (rr?.allowed && !rr.allowed.includes('DK')) return false
      return true
    })
    .map((item) => {
      const duration = item.contentDetails.duration
      return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: bestThumbnail(item.snippet.thumbnails),
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        duration,
        durationSeconds: iso8601ToSeconds(duration),
        publishedAt: item.snippet.publishedAt,
      }
    })

  return {
    channelId,
    videos,
    nextPageToken: playlistRaw.nextPageToken ?? null,
  }
}
