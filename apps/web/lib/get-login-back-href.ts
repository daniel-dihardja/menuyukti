import { headers } from 'next/headers'

import { PROTECTED_APP_SHELL_PREFIXES } from '@/lib/routes'

function isProtectedAppPath(pathname: string): boolean {
  return PROTECTED_APP_SHELL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Same-origin path from the Referer header for the login page "Back" control, or `/` when
 * unknown or unsafe (e.g. referer is another site, `/login`, or a gated app route).
 */
export async function getLoginBackHref(): Promise<string> {
  const h = await headers()
  const referer = h.get('referer')
  const forwarded = h.get('x-forwarded-host')
  const host = forwarded?.split(',')[0]?.trim() ?? h.get('host')

  if (!referer || !host) return '/'

  try {
    const url = new URL(referer)
    if (url.host !== host) return '/'

    const pathname = url.pathname
    if (pathname.startsWith('/login')) return '/'
    if (isProtectedAppPath(pathname)) return '/'

    const path = `${pathname}${url.search}`
    return path || '/'
  } catch {
    return '/'
  }
}
