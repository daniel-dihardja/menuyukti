import { auth } from '@clerk/nextjs/server'
import { connection, NextResponse } from 'next/server'

import { isProPlan } from '@/lib/workspace-plan'
import { getWorkspacePlanForUser } from '@/lib/workspace-plan-server'

export type ProPlanApiAuth = { ok: true; userId: string } | { ok: false; response: NextResponse }

/**
 * Use in Route Handlers for Pro workspace product APIs (chat, media, …).
 * Free / guest workspaces are rejected with 403.
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
  const { plan } = await getWorkspacePlanForUser()
  if (!isProPlan(plan)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Pro plan required' }, { status: 403 }),
    }
  }
  return { ok: true, userId }
}
