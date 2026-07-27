import { GetObjectCommand, NoSuchKey } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { Readable } from 'node:stream'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import {
  getS3Bucket,
  getS3Client,
  igStoryContentTypeForFilename,
  isSafeIgStoryFilename,
} from '@/lib/assets/storage'
import { requireWorkspaceMediaAccess, resolveObjectKey } from '@/lib/assets/workspace-media-access'

export async function GET(req: Request) {
  const authz = await requireAuthenticatedApi()
  if (!authz.ok) return authz.response
  const { userId } = authz

  const mediaAccess = await requireWorkspaceMediaAccess(userId, 'read')
  if (!mediaAccess.ok) return mediaAccess.response

  const url = new URL(req.url)
  const name = url.searchParams.get('name')?.trim() ?? ''
  if (!name || !isSafeIgStoryFilename(name)) {
    return NextResponse.json({ message: 'Invalid filename' }, { status: 400 })
  }

  const contentType = igStoryContentTypeForFilename(name)
  if (!contentType) {
    return NextResponse.json({ message: 'Invalid filename' }, { status: 400 })
  }

  const key = await resolveObjectKey(mediaAccess.access, 'igstories', name)
  if (!key) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  const s3 = getS3Client()
  const bucket = getS3Bucket()

  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    )

    const body = result.Body
    if (!body) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const webStream = Readable.toWeb(body as Readable)

    return new NextResponse(webStream as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${name}"`,
        ...(result.ContentLength != null ? { 'Content-Length': String(result.ContentLength) } : {}),
      },
    })
  } catch (err) {
    if (err instanceof NoSuchKey || (err as { name?: string })?.name === 'NoSuchKey') {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    console.error('[igstories/download] S3 GetObject failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Download failed' }, { status: 502 })
  }
}
