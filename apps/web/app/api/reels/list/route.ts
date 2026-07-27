import { NextResponse } from 'next/server'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { getPresignedGetUrl, getReelMediaType, isSafeReelFilename } from '@/lib/assets/storage'
import {
  listWorkspaceMediaObjects,
  requireWorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'

export async function GET() {
  const authz = await requireAuthenticatedApi()
  if (!authz.ok) return authz.response
  const { userId } = authz

  const mediaAccess = await requireWorkspaceMediaAccess(userId, 'read')
  if (!mediaAccess.ok) return mediaAccess.response

  type Row = {
    name: string
    url: string
    size: number
    createdAt: string
    mediaType: 'image' | 'video'
  }

  try {
    const objects = await listWorkspaceMediaObjects(mediaAccess.access, 'reels', isSafeReelFilename)
    const rows: Row[] = []
    for (const obj of objects) {
      const mediaType = getReelMediaType(obj.name)
      if (!mediaType) continue
      rows.push({
        name: obj.name,
        url: await getPresignedGetUrl(obj.key),
        size: obj.size,
        createdAt: obj.createdAt,
        mediaType,
      })
    }

    const sortedRows = rows.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))

    return NextResponse.json(
      { items: sortedRows },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
        },
      },
    )
  } catch (err) {
    console.error('[reels/list] S3 list failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Failed to list reels' }, { status: 502 })
  }
}
