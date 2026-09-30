import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'

type PageProps = {
  params: Promise<{ slug: string }>
}

/** Legacy guest wall URL — redirects to the public digital menu. */
export default async function PublicLocationWallRedirectPage({ params }: PageProps) {
  const { slug } = await params
  redirect(routes.public.locationMenu(decodeURIComponent(slug)))
}
