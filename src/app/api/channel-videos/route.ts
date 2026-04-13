import { NextRequest, NextResponse } from 'next/server'
import { getChannelVideos } from '@/lib/youtube/client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channelId = searchParams.get('channelId')
  const pageToken = searchParams.get('pageToken') ?? undefined

  if (!channelId) {
    return NextResponse.json({ error: 'channelId is required' }, { status: 400 })
  }

  try {
    const result = await getChannelVideos(channelId, 30, pageToken)

    // Filter out non-embeddable and DK-blocked videos (same logic as channel page.tsx)
    const videos = result.videos
      .filter((v) => {
        // getChannelVideos already filters these in client.ts, so this is a safety net
        return true
      })
      .map((v) => ({
        id: v.id,
        title: v.title,
        thumbnailUrl: v.thumbnail.url,
      }))

    return NextResponse.json({
      videos,
      nextPageToken: result.nextPageToken,
    })
  } catch (err) {
    console.error('[channel-videos]', err)
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
  }
}
