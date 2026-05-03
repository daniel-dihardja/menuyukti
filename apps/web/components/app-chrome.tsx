'use client'

import { usePathname } from 'next/navigation'

import { MainHeader } from '@/components/main-header'
import { isProtectedAppShellPath } from '@/lib/routes'

const HIDE_HEADER_PREFIXES = ['/sign-up', '/sso-callback', '/privacy', '/terms']

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideForAuthOrLegal =
    pathname != null &&
    HIDE_HEADER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const hideForAppShell = isProtectedAppShellPath(pathname)
  const hideHeader = hideForAuthOrLegal || hideForAppShell

  return (
    <>
      {!hideHeader ? <MainHeader /> : null}
      {children}
    </>
  )
}
