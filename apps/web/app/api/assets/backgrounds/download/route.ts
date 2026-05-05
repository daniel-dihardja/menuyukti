import { NextResponse } from 'next/server'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

import { backgroundObjectKey, isSafeBackgroundFilename } from '@/lib/assets/backgrounds'
import { getPresignedAttachmentUrl } from '@/lib/assets/storage'

export async function GET(req: Request) {
  const authz = await requireMenuyuktiAdminApi()
  if (!authz.ok) return authz.response

  const url = new URL(req.url)
  const name = url.searchParams.get('name')?.trim() ?? ''
  if (!name || !isSafeBackgroundFilename(name)) {
    return NextResponse.json({ message: 'Invalid filename' }, { status: 400 })
  }

  const key = backgroundObjectKey(name)

  try {
    const signed = await getPresignedAttachmentUrl(key, name)
    return NextResponse.redirect(signed, 302)
  } catch (err) {
    console.error('[assets/backgrounds/download] presign failed', {
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Download failed' }, { status: 502 })
  }
}
