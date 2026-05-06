import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'

type PageProps = {
  params: Promise<{ id: string }>
}

/** Reserved for future per-session canvas routes; library lives at `/canvas`. */
export default async function Page({ params }: PageProps) {
  await params
  redirect(routes.canvas)
}
