import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { loadPublicLocationMenu } from '@/lib/public-menu/load-public-menu'
import { isReservedPublicSlug } from '@/lib/public-location/reserved-slugs'
import { notFound } from 'next/navigation'

import { PublicLocationMenuBody, PublicMenuFallback } from './public-menu-page-body'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('public.menu')
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  if (isReservedPublicSlug(decoded)) {
    return { title: t('notFoundTitle') }
  }
  try {
    const menu = await loadPublicLocationMenu(decoded)
    if (!menu) {
      return { title: t('notFoundTitle') }
    }
    const title = menu.name
    const description = t('metaDescription', { name: menu.name })
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        ...(menu.headerImageUrl ? { images: [{ url: menu.headerImageUrl }] } : {}),
      },
    }
  } catch {
    return { title: t('notFoundTitle') }
  }
}

async function PublicLocationMenuContent({ params }: PageProps) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  if (isReservedPublicSlug(decoded)) notFound()
  return <PublicLocationMenuBody slug={slug} tableLabel={null} />
}

export default function PublicLocationMenuPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PublicMenuFallback />}>
      <PublicLocationMenuContent params={params} />
    </Suspense>
  )
}
