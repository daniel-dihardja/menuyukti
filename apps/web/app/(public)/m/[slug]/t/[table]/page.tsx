import { redirect } from 'next/navigation'

import { parsePublicMenuTableLabel } from '@/lib/public-menu/table-label'
import { routes } from '@/lib/routes'
import { notFound } from 'next/navigation'

type PageProps = {
  params: Promise<{ slug: string; table: string }>
}

/** Legacy `/m/[slug]/t/[table]` — redirects to `/{slug}/menu/t/{table}`. */
export default async function LegacyPublicMenuTableRedirectPage({ params }: PageProps) {
  const { slug, table } = await params
  const tableLabel = parsePublicMenuTableLabel(table)
  if (!tableLabel) notFound()
  redirect(routes.public.locationMenuTable(decodeURIComponent(slug), tableLabel))
}
