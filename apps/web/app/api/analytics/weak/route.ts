import { NextResponse } from 'next/server'

import { prepareChatAnalyticsGet } from '@/lib/analytics/chat-analytics-route'
import { loadWeakForChat } from '@/lib/analytics/load-weak-for-chat'

/**
 * GET /api/analytics/weak?analyticsRunId=...&locationId=...
 * Menu-engineering Weak items review payload for chat visualizations.
 */
export async function GET(req: Request) {
  try {
    const prepared = await prepareChatAnalyticsGet(req)
    if (!prepared.ok) return prepared.response

    const result = await loadWeakForChat({
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
    console.error('[api/analytics/weak]', error)
    return NextResponse.json({ error: 'Failed to load Weak items review' }, { status: 500 })
  }
}
