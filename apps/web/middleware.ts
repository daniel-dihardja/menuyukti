import { NextResponse } from 'next/server'

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

import { getDefaultAuthenticatedPath, isPathnameFeatureEnabled } from '@/lib/feature-flags'
import { shouldRedirectPendingSession } from '@/lib/middleware-pending-session'
import { routes } from '@/lib/routes'

/** Keep route prefixes aligned with `PROTECTED_APP_SHELL_PREFIXES` in `lib/routes.ts` (MainHeader visibility). */
const isProtectedRoute = createRouteMatcher([
  '/analytics(.*)',
  '/workflow(.*)',
  '/calendar(.*)',
  '/ig-studio(.*)',
  '/media(.*)',
  '/content(.*)',
  '/advisor(.*)',
  '/agent(.*)',
  '/print-orders(.*)',
  '/dashboard(.*)',
  '/staff(.*)',
  '/usage(.*)',
  '/profile(.*)',
])

// Use default env resolution (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY). Do not pass
// secretKey/publishableKey via the dynamic-keys callback unless CLERK_ENCRYPTION_KEY is set — see
// https://clerk.com/docs/references/nextjs/clerk-middleware#dynamic-keys
export default clerkMiddleware(async (auth, req) => {
  const { sessionStatus, userId } = await auth()
  const pathname = req.nextUrl.pathname
  const homePath = getDefaultAuthenticatedPath()

  // Session tasks (e.g. MFA): keep pending users on auth routes; block protected app until complete.
  if (shouldRedirectPendingSession(pathname, sessionStatus)) {
    return NextResponse.redirect(new URL(routes.login, req.url))
  }

  if (!isProtectedRoute(req)) {
    if (pathname === '/' && userId) {
      return NextResponse.redirect(new URL(homePath, req.url))
    }
    // Public surfaces (e.g. /shop) can still be feature-disabled.
    if (userId && !isPathnameFeatureEnabled(pathname) && pathname !== homePath) {
      return NextResponse.redirect(new URL(homePath, req.url))
    }
    return
  }

  const signInUrl = new URL(routes.login, req.url).href
  await auth.protect({ unauthenticatedUrl: signInUrl })

  if (!isPathnameFeatureEnabled(pathname) && pathname !== homePath) {
    return NextResponse.redirect(new URL(homePath, req.url))
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
