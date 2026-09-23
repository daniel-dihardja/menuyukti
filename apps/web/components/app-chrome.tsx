'use client'

import { usePathname } from 'next/navigation'

import { MainHeader } from '@/components/main-header'
import { isOperatorAppShellPath } from '@/lib/routes'

const HIDE_HEADER_PREFIXES = ['/sso-callback', '/privacy', '/terms']

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideForAuthOrLegal =
    pathname != null &&
    HIDE_HEADER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  /** Operator sidebar shell only — customer `/home` / `/profile` keep `MainHeader`. */
  const hideForAppShell = isOperatorAppShellPath(pathname)
  const hideHeader = hideForAuthOrLegal || hideForAppShell
  const isLanding = pathname === '/'

  if (!hideHeader && isLanding) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden">
        <MainHeader />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    )
  }

  return (
    <>
      {!hideHeader ? <MainHeader /> : null}
      {children}
    </>
  )
}
