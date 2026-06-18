import { auth } from '@clerk/nextjs/server'
import { connection, NextResponse } from 'next/server'

/** Use in Route Handlers that require any signed-in Clerk user. */
export async function requireAuthenticatedApi(): Promise<
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
  return { ok: true, userId }
}
