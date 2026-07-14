import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { loadPairLiftMatrixForWorkflow } from '@/lib/analytics/load-pair-lift-matrix-for-workflow'

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
 * GET /api/analytics/menu-combos-lift-matrix?analyticsRunId=...&locationId=...
 * Pair lift matrix for workflow visualizations. When the linked run is empty,
 * falls back to other analytics runs for the location (newest first).
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

    const result = await loadPairLiftMatrixForWorkflow({
      userId,
      analyticsRunId,
      locationId,
    })

    return NextResponse.json(
      {
        focusMenus: result.focusMenus,
        matrixLift: result.matrixLift,
        totalOrders: result.totalOrders,
        multiItemOrderCount: result.multiItemOrderCount,
        scope: result.scope,
        analyticsRunId: result.analyticsRunId,
        usedFallbackRun: result.usedFallbackRun,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[api/analytics/menu-combos-lift-matrix]', error)
    return NextResponse.json({ error: 'Failed to load pair lift matrix' }, { status: 500 })
  }
}
