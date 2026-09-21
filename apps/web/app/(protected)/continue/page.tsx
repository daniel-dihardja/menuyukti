import { redirect } from 'next/navigation'

import { getAuthenticatedHomePath } from '@/lib/workspace-plan-server'

/** Plan-aware post-auth landing used by Clerk client finish URLs. */
export default async function ContinuePage() {
  redirect(await getAuthenticatedHomePath())
}
