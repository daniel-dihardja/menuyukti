import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { pathnameRequiresAdmin } from '@/lib/admin-only-features'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { resolveMenuyuktiRole } from '@/lib/menuyukti-role-server'
import { getDefaultPathForPlan } from '@/lib/workspace-plan'

/** Server-side admin-only route gate using `x-pathname` from proxy. */
export async function enforceWorkspacePlanRoute(): Promise<void> {
  const headerStore = await headers()
  const path = headerStore.get('x-pathname')
  if (!path) return

  if (pathnameRequiresAdmin(path)) {
    const role = await resolveMenuyuktiRole()
    if (isMenuyuktiAdmin(role)) return
    redirect(getDefaultPathForPlan())
  }
}
