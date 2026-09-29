import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { pathnameRequiresAdmin } from '@/lib/admin-only-features'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { resolveMenuyuktiRole } from '@/lib/menuyukti-role-server'
import { getWorkspacePlanForUser } from '@/lib/workspace-plan-server'
import { getDefaultPathForPlan, isPathnameAllowedForPlan, isProPlan } from '@/lib/workspace-plan'

/** Server-side free-plan + admin-only route gate using `x-pathname` from proxy. */
export async function enforceWorkspacePlanRoute(): Promise<void> {
  const headerStore = await headers()
  const path = headerStore.get('x-pathname')
  if (!path) return

  if (pathnameRequiresAdmin(path)) {
    const role = await resolveMenuyuktiRole()
    if (isMenuyuktiAdmin(role)) return
    const { plan } = await getWorkspacePlanForUser()
    redirect(getDefaultPathForPlan(plan))
  }

  const { plan } = await getWorkspacePlanForUser()
  if (isProPlan(plan)) return

  if (!isPathnameAllowedForPlan(path, plan)) {
    redirect(getDefaultPathForPlan(plan))
  }
}
