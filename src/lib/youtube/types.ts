// TypeScript interfaces for the YouTube gateway layer.
// These are our own simplified shapes — not the raw YouTube Data API response types.

export interface YouTubeThumbnail {
  url: string
  width: number
  height: number
}

export interface YouTubeThumbnails {
  default: YouTubeThumbnail
  medium: YouTubeThumbnail
  high: YouTubeThumbnail
}

// ── Search ──────────────────────────────────────────────────────────────────

export type SearchResultKind = 'video' | 'channel'

export interface YouTubeSearchResult {
  kind: SearchResultKind
  id: string              // videoId or channelId depending on kind
  title: string
  description: string
  thumbnail: YouTubeThumbnail
  channelId: string
  channelTitle: string
  publishedAt: string | null
}

export interface YouTubeSearchResponse {
  results: YouTubeSearchResult[]
  totalResults: number
  nextPageToken: string | null
  query: string
}

// ── Channel ──────────────────────────────────────────────────────────────────

export interface YouTubeChannel {
  id: string
  title: string
  description: string
  thumbnail: YouTubeThumbnail
  customUrl: string | null
  subscriberCount: number | null
  videoCount: number | null
  publishedAt: string | null
}

// ── Video ────────────────────────────────────────────────────────────────────

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: YouTubeThumbnail
  channelId: string
  channelTitle: string
  duration: string        // ISO 8601 duration, e.g. "PT4M13S"
  durationSeconds: number
  publishedAt: string
}

// ── Channel videos ────────────────────────────────────────────────────────────

export interface YouTubeChannelVideosResponse {
  channelId: string
  videos: YouTubeVideo[]
  nextPageToken: string | null
}
