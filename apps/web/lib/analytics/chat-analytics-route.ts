import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export function isPrerenderInterrupt(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const digest = (error as Error & { digest?: string }).digest
  return digest === 'NEXT_PRERENDER_INTERRUPTED' || digest === 'HANGING_PROMISE_REJECTION'
}

export function parsePositiveInt(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export type ChatAnalyticsAuth = { ok: true; userId: string } | { ok: false; response: NextResponse }

/**
 * Clerk auth for chat visualization BFF GETs. Call after `await connection()`.
 */
export async function requireChatAnalyticsAuth(): Promise<ChatAnalyticsAuth> {
  let isAuthenticated = false
  let userId: string | null = null
  try {
    const authResult = await auth()
    isAuthenticated = authResult.isAuthenticated
    userId = authResult.userId
  } catch (error) {
    if (isPrerenderInterrupt(error)) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      }
    }
    throw error
  }
  if (!isAuthenticated || !userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { ok: true, userId }
}

export type ChatAnalyticsQuery =
  | { ok: true; analyticsRunId: number | null; locationId: number | null }
  | { ok: false; response: NextResponse }

/**
 * Parse `analyticsRunId` / `locationId` query params. At least one is required.
 */
export function parseChatAnalyticsQuery(req: Request): ChatAnalyticsQuery {
  const { searchParams } = new URL(req.url)
  const analyticsRunId = parsePositiveInt(searchParams.get('analyticsRunId'))
  const locationId = parsePositiveInt(searchParams.get('locationId'))

  if (analyticsRunId === null && locationId === null) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'analyticsRunId or locationId is required' },
        { status: 400 },
      ),
    }
  }

  return { ok: true, analyticsRunId, locationId }
}

/** Prepare request: connection + auth + query. Returns error response or context. */
export async function prepareChatAnalyticsGet(
  req: Request,
): Promise<
  | { ok: true; userId: string; analyticsRunId: number | null; locationId: number | null }
  | { ok: false; response: NextResponse }
> {
  await connection()
  const authResult = await requireChatAnalyticsAuth()
  if (!authResult.ok) return authResult
  const query = parseChatAnalyticsQuery(req)
  if (!query.ok) return query
  return {
    ok: true,
    userId: authResult.userId,
    analyticsRunId: query.analyticsRunId,
    locationId: query.locationId,
  }
}
