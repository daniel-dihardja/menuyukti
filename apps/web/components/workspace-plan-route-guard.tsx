'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { pathnameRequiresAdmin } from '@/lib/admin-only-features'
import { useMenuyuktiRole } from '@/hooks/use-menuyukti-role'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { getDefaultPathForPlan } from '@/lib/workspace-plan'

/**
 * Redirects non-admins off admin-only paths.
 * Platform admins keep admin-only routes. Plan no longer gates product routes.
 */
export function WorkspacePlanRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { role, isLoaded: roleLoaded } = useMenuyuktiRole()

  useEffect(() => {
    if (!roleLoaded || !pathname) return

    if (pathnameRequiresAdmin(pathname)) {
      if (isMenuyuktiAdmin(role)) return
      router.replace(getDefaultPathForPlan())
    }
  }, [pathname, role, roleLoaded, router])

  return children
}
