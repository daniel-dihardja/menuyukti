import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { loadLowEndForChat } from '@/lib/analytics/load-low-end-for-chat'

function isPrerenderInterrupt(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const digest = (error as Error & { digest?: string }).digest
  return digest === 'NEXT_PRERENDER_INTERRUPTED' || digest === 'HANGING_PROMISE_REJECTION'
}

function parsePositiveInt(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * GET /api/analytics/low-end?analyticsRunId=...&locationId=...
 * Menu-engineering Low End review payload for chat visualizations.
 */
export async function GET(req: Request) {
  try {
    await connection()
    let isAuthenticated = false
    let userId: string | null = null
    try {
      const authResult = await auth()
      isAuthenticated = authResult.isAuthenticated
      userId = authResult.userId
    } catch (error) {
      if (isPrerenderInterrupt(error)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      throw error
    }
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const analyticsRunId = parsePositiveInt(searchParams.get('analyticsRunId'))
    const locationId = parsePositiveInt(searchParams.get('locationId'))

    if (analyticsRunId === null && locationId === null) {
      return NextResponse.json(
        { error: 'analyticsRunId or locationId is required' },
        { status: 400 },
      )
    }

    const result = await loadLowEndForChat({
      userId,
      analyticsRunId,
      locationId,
    })

    return NextResponse.json(
      {
        items: result.items,
        distribution: result.distribution,
        periodStart: result.periodStart,
        periodEnd: result.periodEnd,
        analyticsRunId: result.analyticsRunId,
        usedFallbackRun: result.usedFallbackRun,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[api/analytics/low-end]', error)
    return NextResponse.json({ error: 'Failed to load Low End review' }, { status: 500 })
  }
}
