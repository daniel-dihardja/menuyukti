import { NextResponse } from 'next/server'

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

import { isPathnameFeatureEnabled } from '@/lib/feature-flags'
import { shouldRedirectPendingSession } from '@/lib/middleware-pending-session'
import { getSafeAuthReturnPath, AUTH_RETURN_TO_QUERY } from '@/lib/auth-return-path'
import { routes } from '@/lib/routes'

/** Next.js 16 proxy (network boundary). Keep aligned with operator + customer prefixes in `lib/routes.ts`. */
const isProtectedRoute = createRouteMatcher([
  '/analytics(.*)',
  '/calendar(.*)',
  '/playbooks(.*)',
  '/ig-studio(.*)',
  '/media(.*)',
  '/content(.*)',
  '/advisor(.*)',
  '/agent(.*)',
  '/crm(.*)',
  '/print-orders(.*)',
  '/dashboard(.*)',
  '/home(.*)',
  '/continue(.*)',
  '/staff(.*)',
  '/usage(.*)',
  '/profile(.*)',
  '/inventar(.*)',
])

function nextWithPathname(req: Request, pathname: string): NextResponse {
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)
  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

// Use default env resolution (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY). Do not pass
// secretKey/publishableKey via the dynamic-keys callback unless CLERK_ENCRYPTION_KEY is set — see
// https://clerk.com/docs/references/nextjs/clerk-middleware#dynamic-keys
export default clerkMiddleware(async (auth, req) => {
  const { sessionStatus, userId } = await auth()
  const pathname = req.nextUrl.pathname
  /** Plan-aware post-auth landing (resolves free → `/home`, pro → `/advisor`). */
  const continuePath = routes.authContinue

  // Session tasks (e.g. MFA): keep pending users on auth routes; block protected app until complete.
  if (shouldRedirectPendingSession(pathname, sessionStatus)) {
    const loginUrl = new URL(routes.login, req.url)
    const returnTo = getSafeAuthReturnPath(req.nextUrl.searchParams.get(AUTH_RETURN_TO_QUERY))
    if (returnTo) {
      loginUrl.searchParams.set(AUTH_RETURN_TO_QUERY, returnTo)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (!isProtectedRoute(req)) {
    if (pathname === '/' && userId) {
      return NextResponse.redirect(new URL(continuePath, req.url))
    }
    // Public surfaces (e.g. /shop) can still be feature-disabled.
    if (userId && !isPathnameFeatureEnabled(pathname) && pathname !== continuePath) {
      return NextResponse.redirect(new URL(continuePath, req.url))
    }
    return nextWithPathname(req, pathname)
  }

  const signInUrl = new URL(routes.login, req.url)
  const returnTo = getSafeAuthReturnPath(req.nextUrl.searchParams.get(AUTH_RETURN_TO_QUERY))
  if (returnTo) {
    signInUrl.searchParams.set(AUTH_RETURN_TO_QUERY, returnTo)
  }
  await auth.protect({ unauthenticatedUrl: signInUrl.href })

  if (!isPathnameFeatureEnabled(pathname) && pathname !== continuePath) {
    return NextResponse.redirect(new URL(continuePath, req.url))
  }

  return nextWithPathname(req, pathname)
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
