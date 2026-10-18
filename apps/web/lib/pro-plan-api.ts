import { auth } from '@clerk/nextjs/server'
import { connection, NextResponse } from 'next/server'

export type ProPlanApiAuth = { ok: true; userId: string } | { ok: false; response: NextResponse }

/**
 * Auth gate for product APIs (chat, media, …).
 * Name kept for call-site compatibility; plan is no longer checked (one user type).
 */
export async function requireProPlanApi(): Promise<ProPlanApiAuth> {
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
