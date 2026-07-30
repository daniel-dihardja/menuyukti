import { NextResponse } from 'next/server'

import {
  PRESIGN_PHOTOS_MAX_NAMES,
  presignPhotosBodySchema,
} from '@/app/api/media/presign-photos/schema'
import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { requireWorkspaceMediaAccess } from '@/lib/assets/workspace-media-access'
import { presignPhotoUrlsForAccess } from '@/lib/media/presign-photo-urls'

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

  const parsed = presignPhotosBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
  }

  const names = parsed.data.names.slice(0, PRESIGN_PHOTOS_MAX_NAMES)
  const urls = await presignPhotoUrlsForAccess(mediaAccess.access, names)
  return NextResponse.json({ urls })
}
