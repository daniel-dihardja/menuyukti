import { NextResponse } from 'next/server'

import { getShopProductBySlug } from '@/components/shop/shop-catalog'
import { getPresignedAttachmentUrl } from '@/lib/assets/storage'
import { SHOP_DELIVERABLE_PREFIX } from '@/lib/shop/shop-deliverables'

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug')?.trim() ?? ''
  const product = slug ? getShopProductBySlug(slug) : undefined
  const deliverable = product?.digitalDeliverable
  if (!product || !deliverable) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  if (!deliverable.objectKey.startsWith(`${SHOP_DELIVERABLE_PREFIX}/`)) {
    console.error('[shop/download] invalid deliverable key', { slug })
    return NextResponse.json({ message: 'Invalid product configuration' }, { status: 500 })
  }

  try {
    const url = await getPresignedAttachmentUrl(deliverable.objectKey, deliverable.downloadFilename)
    return NextResponse.redirect(url, 302)
  } catch (err) {
    console.error('[shop/download] presign failed', {
      slug,
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Download unavailable' }, { status: 503 })
  }
}
