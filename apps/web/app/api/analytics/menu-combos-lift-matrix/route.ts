import { NextResponse } from 'next/server'

import { prepareChatAnalyticsGet } from '@/lib/analytics/chat-analytics-route'
import { loadPairLiftMatrixForChat } from '@/lib/analytics/load-pair-lift-matrix-for-chat'

/**
 * GET /api/analytics/menu-combos-lift-matrix?analyticsRunId=...&locationId=...
 * Pair lift matrix for chat visualizations. When the linked run is empty,
 * falls back to other analytics runs for the location (newest first).
 */
export async function GET(req: Request) {
  try {
    const prepared = await prepareChatAnalyticsGet(req)
    if (!prepared.ok) return prepared.response

    const result = await loadPairLiftMatrixForChat({
      userId: prepared.userId,
      analyticsRunId: prepared.analyticsRunId,
      locationId: prepared.locationId,
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
