import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'

type PageProps = {
  params: Promise<{ slug: string }>
}

/** Legacy `/m/[slug]` — redirects to `/{slug}/menu`. */
export default async function LegacyPublicMenuRedirectPage({ params }: PageProps) {
  const { slug } = await params
  redirect(routes.public.locationMenu(decodeURIComponent(slug)))
}
