import { NextResponse } from 'next/server'

import { prepareChatAnalyticsGet } from '@/lib/analytics/chat-analytics-route'
import { loadSlotDemandProfileForChat } from '@/lib/analytics/load-slot-demand-profile-for-chat'

/**
 * GET /api/analytics/order-metrics?analyticsRunId=...&locationId=...
 * Slot demand profile for chat visualizations. When the linked run is empty,
 * falls back to other analytics runs for the location (newest first).
 */
export async function GET(req: Request) {
  try {
    const prepared = await prepareChatAnalyticsGet(req)
    if (!prepared.ok) return prepared.response

    const result = await loadSlotDemandProfileForChat({
      userId: prepared.userId,
      analyticsRunId: prepared.analyticsRunId,
      locationId: prepared.locationId,
    })

    return NextResponse.json(
      {
        slotDemandProfile: result.slotDemandProfile,
        analyticsRunId: result.analyticsRunId,
        usedFallbackRun: result.usedFallbackRun,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[api/analytics/order-metrics]', error)
    return NextResponse.json({ error: 'Failed to load order metrics' }, { status: 500 })
  }
}
