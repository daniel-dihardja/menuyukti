import { GetObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import { getS3Bucket, getS3Client, isSafePhotoFilename } from '@/lib/assets/storage'
import { requireWorkspaceMediaAccess, resolveObjectKey } from '@/lib/assets/workspace-media-access'

/** Ensure the reference image exists in the workspace media library (incl. legacy owner keys). */
export async function assertUserPhotoExists(
  userId: string,
  filename: string,
): Promise<NextResponse | null> {
  if (!isSafePhotoFilename(filename)) {
    return NextResponse.json({ message: 'Invalid reference image name' }, { status: 400 })
  }

  const mediaAccess = await requireWorkspaceMediaAccess(userId, 'read')
  if (!mediaAccess.ok) {
    return mediaAccess.response
  }

  const key = await resolveObjectKey(mediaAccess.access, 'photos', filename)
  if (!key) {
    return NextResponse.json({ message: 'Reference image not found' }, { status: 400 })
  }

  try {
    const result = await getS3Client().send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: key,
      }),
    )
    if (!result.Body) {
      return NextResponse.json({ message: 'Reference image not found' }, { status: 400 })
    }
  } catch (err) {
    console.error('[styles] reference image lookup failed', {
      userIdPrefix: userId.slice(0, 8),
      filename,
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Reference image not found' }, { status: 400 })
  }
  return null
}

export function mapGraphqlStyleError(message: string): { status: number; message: string } {
  const lower = message.toLowerCase()
  if (lower.includes('access denied') || lower.includes('permission')) {
    return { status: 403, message: 'Access denied' }
  }
  if (lower.includes('not found')) {
    return { status: 404, message }
  }
  if (
    lower.includes('required') ||
    lower.includes('invalid') ||
    lower.includes('at most') ||
    lower.includes('must be') ||
    lower.includes('in use')
  ) {
    return { status: 400, message }
  }
  return { status: 500, message }
}
