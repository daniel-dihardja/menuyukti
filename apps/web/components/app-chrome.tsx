'use client'

import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { isProtectedAppShellPath } from '@/lib/routes'

const HIDE_HEADER_PREFIXES = ['/login', '/sign-up', '/sso-callback']

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isLoaded, isSignedIn } = useAuth()
  const hideHeader =
    pathname != null &&
    HIDE_HEADER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const isRootPage = pathname === '/' || pathname === ''
  /** Shop uses `ShopNav` (branding + Clerk). Avoid duplicate headers / duplicate auth controls. */
  const isShopRoute = pathname != null && pathname.startsWith('/shop')
  const showChromeHeader = isLoaded && !hideHeader && !isShopRoute && (isSignedIn || !isRootPage)
  const profileInSidebarHeader = isLoaded && isSignedIn && isProtectedAppShellPath(pathname)

  return (
    <>
      {showChromeHeader && !profileInSidebarHeader && (
        <header className="flex items-center justify-end gap-2 border-b px-4 py-2">
          <Show when="signed-out">
            <SignInButton />
            <SignUpButton />
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </header>
      )}
      {children}
    </>
  )
}
