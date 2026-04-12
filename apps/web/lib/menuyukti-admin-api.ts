import { auth } from '@clerk/nextjs/server'
import { connection, NextResponse } from 'next/server'

import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { resolveMenuyuktiRole } from '@/lib/menuyukti-role-server'

/** Use in Route Handlers for Studio / brand-asset APIs (admin-only). */
export async function requireMenuyuktiAdminApi(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
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
