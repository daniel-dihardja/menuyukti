'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { pathnameRequiresAdmin } from '@/lib/admin-only-features'
import { useMenuyuktiRole } from '@/hooks/use-menuyukti-role'
import { useWorkspacePlan } from '@/hooks/use-workspace-plan'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { getDefaultPathForPlan, isPathnameAllowedForPlan, isProPlan } from '@/lib/workspace-plan'

/**
 * Redirects free-plan users off gated product routes and non-admins off admin-only paths.
 * Platform admins keep admin-only routes regardless of workspace plan.
 */
export function WorkspacePlanRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { plan } = useWorkspacePlan()
  const { role, isLoaded: roleLoaded } = useMenuyuktiRole()

  useEffect(() => {
    if (!roleLoaded || !pathname) return

    if (pathnameRequiresAdmin(pathname)) {
      if (isMenuyuktiAdmin(role)) return
      router.replace(getDefaultPathForPlan(plan))
      return
    }

    if (isProPlan(plan)) return

    if (!isPathnameAllowedForPlan(pathname, plan)) {
      router.replace(getDefaultPathForPlan(plan))
    }
  }, [plan, pathname, role, roleLoaded, router])

  return children
}
