import { auth } from '@clerk/nextjs/server'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'

/**
 * Auth-required Explore directory (no operator sidebar).
 * Chrome: global `MainHeader` via `AppChrome`. Prefer proxy `auth.protect`; this is defense-in-depth.
 */
export const instant = false

export default async function ExploreLayout({ children }: { children: React.ReactNode }) {
  await connection()
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    redirect(routes.login)
  }

  return children
}
