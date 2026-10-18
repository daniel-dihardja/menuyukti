'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'

import { MainHeader } from '@/components/main-header'
import { isOperatorAppShellPath } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'

const HIDE_HEADER_PREFIXES = ['/sso-callback', '/privacy', '/terms']

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
  /** Landing locks the viewport; keep the same DOM tree on other marketing routes so MainHeader does not remount (nav flash). */
  const lockLandingViewport = !hideHeader && pathname === '/'

  if (hideHeader) {
    return <>{children}</>
  }

  return (
    <div className={cn(lockLandingViewport && 'flex h-dvh flex-col overflow-hidden')}>
      <MainHeader />
      <div className={cn(lockLandingViewport && 'min-h-0 flex-1 overflow-y-auto')}>{children}</div>
    </div>
  )
}
