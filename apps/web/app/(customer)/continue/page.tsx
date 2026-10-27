import { redirect } from 'next/navigation'

import { getSafeAuthReturnPath } from '@/lib/auth-return-path'
import { getDefaultAuthenticatedPath } from '@/lib/feature-flags'

type ContinuePageProps = {
  searchParams: Promise<{ next?: string | string[] }>
}

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

/**
 * Post-auth landing used by Clerk finish URLs and feature-flag bounces.
 * Optional `?next=` returns to a safe public menu; otherwise → Advisor
 * (`defaultAuthenticatedPath`; no workspace GraphQL — ensure runs on the destination layout).
 */
export default async function ContinuePage({ searchParams }: ContinuePageProps) {
  const params = await searchParams
  const returnTo = getSafeAuthReturnPath(firstParam(params.next))
  redirect(returnTo ?? getDefaultAuthenticatedPath())
}
