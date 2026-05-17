'use client'

import { useSidebar } from '@workspace/ui/components/sidebar'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/** Closes the mobile sidebar sheet when the route changes (e.g. after tapping a nav link). */
export function useCloseMobileSidebarOnNavigate() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])
}
