import { NextResponse } from 'next/server'

import { prepareChatAnalyticsGet } from '@/lib/analytics/chat-analytics-route'
import { loadLowEndForChat } from '@/lib/analytics/load-low-end-for-chat'

/**
 * GET /api/analytics/low-end?analyticsRunId=...&locationId=...
 * Menu-engineering Low End review payload for chat visualizations.
 */
export async function GET(req: Request) {
  try {
    const prepared = await prepareChatAnalyticsGet(req)
    if (!prepared.ok) return prepared.response

    const result = await loadLowEndForChat({
      userId: prepared.userId,
      analyticsRunId: prepared.analyticsRunId,
      locationId: prepared.locationId,
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
