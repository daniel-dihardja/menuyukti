import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { isSafeReelFilename } from '@/lib/assets/storage'
import {
  deleteMediaFilename,
  requireWorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'

const bodySchema = z.object({
  name: z.string().min(1),
})

export async function DELETE(req: Request) {
  const authz = await requireAuthenticatedApi()
  if (!authz.ok) return authz.response
  const { userId } = authz

  const mediaAccess = await requireWorkspaceMediaAccess(userId, 'delete')
  if (!mediaAccess.ok) return mediaAccess.response

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid body' }, { status: 400 })
  }

  const { name } = parsed.data
  if (!isSafeReelFilename(name)) {
    return NextResponse.json({ message: 'Invalid filename' }, { status: 400 })
  }

  try {
    await deleteMediaFilename(mediaAccess.access, 'reels', name)
  } catch (err) {
    console.error('[reels/delete] S3 DeleteObject failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Delete failed' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
