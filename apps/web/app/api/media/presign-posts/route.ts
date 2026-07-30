import { NextResponse } from 'next/server'

import { presignPostsBodySchema } from '@/app/api/media/presign-posts/schema'
import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { getPresignedGetUrl } from '@/lib/assets/storage'
import {
  isPostKeyAllowedForAccess,
  requireWorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'

export async function POST(req: Request) {
  const authz = await requireAuthenticatedApi()
  if (!authz.ok) return authz.response
  const { userId } = authz

  const mediaAccess = await requireWorkspaceMediaAccess(userId, 'read')
  if (!mediaAccess.ok) return mediaAccess.response

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = presignPostsBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
  }

  const urls: Record<string, string> = {}
  await Promise.all(
    parsed.data.keys.map(async (key) => {
      if (!isPostKeyAllowedForAccess(mediaAccess.access, key)) {
        return
      }
      try {
        urls[key] = await getPresignedGetUrl(key)
      } catch (err) {
        console.error('[media/presign-posts] presign failed', {
          mediaS3Key: key,
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }),
  )

  return NextResponse.json({ urls })
}
