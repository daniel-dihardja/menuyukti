import { redirect } from 'next/navigation'

import { getSafeAuthReturnPath } from '@/lib/auth-return-path'
import { getAuthenticatedHomePath } from '@/lib/workspace-plan-server'

type ContinuePageProps = {
  searchParams: Promise<{ next?: string | string[] }>
}

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

/**
 * Plan-aware post-auth landing used by Clerk client finish URLs.
 * Optional `?next=/m/slug` returns guests to the public menu they signed in from.
 */
export default async function ContinuePage({ searchParams }: ContinuePageProps) {
  const params = await searchParams
  const returnTo = getSafeAuthReturnPath(firstParam(params.next))
  if (returnTo) {
    redirect(returnTo)
  }
  redirect(await getAuthenticatedHomePath())
}
