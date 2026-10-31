'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'

import { BetaStatusBanner } from '@/components/beta-status-banner'
import { MainHeader } from '@/components/main-header'
import { isOperatorAppShellPath } from '@/lib/routes'

const HIDE_HEADER_PREFIXES = ['/sso-callback', '/privacy', '/terms', '/impressum']

/**
 * Pathname-gated chrome. `usePathname` suspends for dynamic routes during
 * Cache Components prerender — keep the hook inside Suspense so `{children}`
 * still paint in the static shell.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <AppChromeInner>{children}</AppChromeInner>
    </Suspense>
  )
}

function AppChromeInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideForAuthOrLegal =
    pathname != null &&
    HIDE_HEADER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  /** Operator sidebar shell only — customer `/home` / `/profile` keep `MainHeader`. */
  const hideForAppShell = isOperatorAppShellPath(pathname)
  const hideHeader = hideForAuthOrLegal || hideForAppShell
  if (hideHeader) {
    return <>{children}</>
  }

  return (
    <div>
      <MainHeader />
      <div>{children}</div>
      <BetaStatusBanner />
    </div>
  )
}
