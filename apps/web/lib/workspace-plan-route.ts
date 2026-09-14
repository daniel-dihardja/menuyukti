import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { resolveMenuyuktiRole } from '@/lib/menuyukti-role-server'
import { routes } from '@/lib/routes'
import { getWorkspacePlanForUser } from '@/lib/workspace-plan-server'
import {
  getDefaultPathForPlan,
  isPathnameAllowedForPlan,
  isProPlan,
} from '@/lib/workspace-plan'

/** Server-side free-plan route gate using `x-pathname` from proxy. */
export async function enforceWorkspacePlanRoute(): Promise<void> {
  const headerStore = await headers()
  const path = headerStore.get('x-pathname')
  if (!path) return

  const { plan } = await getWorkspacePlanForUser()
  if (isProPlan(plan)) return

  if (path === routes.staff || path.startsWith(`${routes.staff}/`)) {
    const role = await resolveMenuyuktiRole()
    if (isMenuyuktiAdmin(role)) return
  }

  if (!isPathnameAllowedForPlan(path, plan)) {
    redirect(getDefaultPathForPlan(plan))
  }
}
