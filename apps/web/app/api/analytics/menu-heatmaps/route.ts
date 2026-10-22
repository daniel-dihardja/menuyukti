import { NextResponse } from 'next/server'

import { prepareChatAnalyticsGet } from '@/lib/analytics/chat-analytics-route'
import { loadMenuHeatmapsForChat } from '@/lib/analytics/load-menu-heatmaps-for-chat'

/**
 * GET /api/analytics/menu-heatmaps?analyticsRunId=...&locationId=...
 * Menu heatmaps (and optional matrix items) for chat visualizations.
 * When the linked run is empty, falls back to other analytics runs for the location.
 */
export async function GET(req: Request) {
  try {
    const prepared = await prepareChatAnalyticsGet(req)
    if (!prepared.ok) return prepared.response

    const result = await loadMenuHeatmapsForChat({
      userId: prepared.userId,
      analyticsRunId: prepared.analyticsRunId,
      locationId: prepared.locationId,
    })

    return NextResponse.json(
      {
        menuHeatmaps: result.menuHeatmaps,
        matrixItems: result.matrixItems,
        dailyStartHour: result.dailyStartHour,
        dailyEndHour: result.dailyEndHour,
        analyticsRunId: result.analyticsRunId,
        usedFallbackRun: result.usedFallbackRun,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[api/analytics/menu-heatmaps]', error)
    return NextResponse.json({ error: 'Failed to load menu heatmaps' }, { status: 500 })
  }
}
