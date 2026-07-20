import { auth } from '@clerk/nextjs/server'
import { connection, NextResponse } from 'next/server'

import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { resolveMenuyuktiRole } from '@/lib/menuyukti-role-server'

export type MenuyuktiAdminApiAuth =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }

/** Use in Route Handlers for Studio / brand-asset APIs (admin-only). */
export async function requireMenuyuktiAdminApi(): Promise<MenuyuktiAdminApiAuth> {
  await connection()
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  const role = await resolveMenuyuktiRole()
  if (!isMenuyuktiAdmin(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { ok: true, userId }
}

/**
 * Clerk admin session, or service-to-service call with matching
 * ``GRAPHQL_INTERNAL_API_KEY`` + ``X-User-Id`` (agents → web generate).
 */
export async function requireMenuyuktiAdminOrInternalApi(
  req: Request,
): Promise<MenuyuktiAdminApiAuth> {
  const apiKey = process.env.GRAPHQL_INTERNAL_API_KEY?.trim()
  const requestKey = req.headers.get('X-Internal-Api-Key')?.trim()
  const userIdHeader = req.headers.get('X-User-Id')?.trim()

  if (apiKey && requestKey && requestKey === apiKey && userIdHeader) {
    await connection()
    return { ok: true, userId: userIdHeader }
  }

  return requireMenuyuktiAdminApi()
}
