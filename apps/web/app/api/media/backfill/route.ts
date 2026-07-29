import { NextResponse } from 'next/server'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { isSafePhotoFilename } from '@/lib/assets/storage'
import {
  listWorkspaceMediaObjects,
  requireWorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  ENSURE_MEDIA_ASSET_MUTATION,
  type EnsureMediaAssetData,
} from '@/lib/graphql/queries/media-collections'

/**
 * Upsert catalog rows for every workspace photo currently in S3.
 * Safe to run repeatedly (ensureMediaAsset is idempotent).
 */
export async function POST() {
  const authz = await requireAuthenticatedApi()
  if (!authz.ok) return authz.response
  const { userId } = authz

  const mediaAccess = await requireWorkspaceMediaAccess(userId, 'write')
  if (!mediaAccess.ok) return mediaAccess.response

  try {
    const objects = await listWorkspaceMediaObjects(
      mediaAccess.access,
      'photos',
      isSafePhotoFilename,
    )

    let ensured = 0
    let failed = 0
    for (const obj of objects) {
      try {
        await graphqlQuery<EnsureMediaAssetData>(
          ENSURE_MEDIA_ASSET_MUTATION,
          { filename: obj.name },
          userId,
        )
        ensured += 1
      } catch (err) {
        failed += 1
        console.error('[media/backfill] ensure failed', {
          name: obj.name,
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return NextResponse.json({
      scanned: objects.length,
      ensured,
      failed,
    })
  } catch (err) {
    console.error('[media/backfill] failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Backfill failed' }, { status: 502 })
  }
}
