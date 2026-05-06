import { GetObjectCommand, NoSuchKey } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { Readable } from 'node:stream'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

import {
  getS3Bucket,
  getS3Client,
  isSafeDesignFilename,
  userDesignsObjectKey,
} from '@/lib/assets/storage'

function contentTypeForDesignName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return 'application/octet-stream'
}

export async function GET(req: Request) {
  const authz = await requireMenuyuktiAdminApi()
  if (!authz.ok) return authz.response
  const { userId } = authz

  const url = new URL(req.url)
  const name = url.searchParams.get('name')?.trim() ?? ''
  if (!name || !isSafeDesignFilename(name)) {
    return NextResponse.json({ message: 'Invalid filename' }, { status: 400 })
  }

  const key = userDesignsObjectKey(userId, name)
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
        'Content-Type': contentTypeForDesignName(name),
        'Content-Disposition': `attachment; filename="${name.replace(/[^\w.-]+/g, '_')}"`,
        ...(result.ContentLength != null ? { 'Content-Length': String(result.ContentLength) } : {}),
      },
    })
  } catch (err) {
    if (err instanceof NoSuchKey || (err as { name?: string })?.name === 'NoSuchKey') {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    console.error('[assets/designs/download] S3 GetObject failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Download failed' }, { status: 502 })
  }
}
