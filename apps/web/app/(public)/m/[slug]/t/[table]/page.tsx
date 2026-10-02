import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { loadPublicLocationMenu } from '@/lib/public-menu/load-public-menu'
import { parsePublicMenuTableLabel } from '@/lib/public-menu/table-label'

import {
  PublicLocationMenuBody,
  PublicMenuFallback,
} from '../../public-menu-page-body'

type PageProps = {
  params: Promise<{ slug: string; table: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('public.menu')
  const { slug, table } = await params
  const tableLabel = parsePublicMenuTableLabel(table)
  try {
    const menu = await loadPublicLocationMenu(decodeURIComponent(slug))
    if (!menu) {
      return { title: t('notFoundTitle') }
    }
    const title = tableLabel ? `${menu.name} · ${tableLabel}` : menu.name
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

async function PublicLocationMenuTableContent({ params }: PageProps) {
  const { slug, table } = await params
  const tableLabel = parsePublicMenuTableLabel(table)
  if (!tableLabel) notFound()
  return <PublicLocationMenuBody slug={slug} tableLabel={tableLabel} />
}

export default function PublicLocationMenuTablePage({ params }: PageProps) {
  return (
    <Suspense fallback={<PublicMenuFallback />}>
      <PublicLocationMenuTableContent params={params} />
    </Suspense>
  )
}
