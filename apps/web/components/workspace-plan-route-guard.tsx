'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useMenuyuktiRole } from '@/hooks/use-menuyukti-role'
import { useWorkspacePlan } from '@/hooks/use-workspace-plan'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { routes } from '@/lib/routes'
import {
  getDefaultPathForPlan,
  isPathnameAllowedForPlan,
  isProPlan,
} from '@/lib/workspace-plan'

/**
 * Redirects free-plan users off gated product routes.
 * Platform admins keep /staff. Pro workspaces are unrestricted.
 */
export function WorkspacePlanRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { plan } = useWorkspacePlan()
  const { role, isLoaded: roleLoaded } = useMenuyuktiRole()

  useEffect(() => {
    if (!roleLoaded || !pathname) return
    if (isProPlan(plan)) return

    if (pathname === routes.staff || pathname.startsWith(`${routes.staff}/`)) {
      if (isMenuyuktiAdmin(role)) return
    }

    if (!isPathnameAllowedForPlan(pathname, plan)) {
      router.replace(getDefaultPathForPlan(plan))
    }
  }, [plan, pathname, role, roleLoaded, router])

  return children
}
