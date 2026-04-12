import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import type { AnalyticsRunsByLocationData } from '@/lib/graphql/queries'
import { ANALYTICS_RUNS_BY_LOCATION_QUERY } from '@/lib/graphql/queries'

/**
 * GET /api/analytics/list?locationId=...
 * Returns analytics runs for the location from GraphQL (no Prisma).
 */
export async function GET(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const locationIdParam = searchParams.get('locationId')
    const locationId = locationIdParam ? Number(locationIdParam) : null

    if (locationId == null || !Number.isInteger(locationId)) {
      return NextResponse.json(
        { error: 'locationId is required and must be an integer' },
        { status: 400 },
      )
    }

    const data = await graphqlQuery<AnalyticsRunsByLocationData>(
      ANALYTICS_RUNS_BY_LOCATION_QUERY,
      { locationId, first: 300 },
      userId,
    )

    const runs = data.analyticsRuns ?? []
    const list = runs.map((run) => ({
      id: Number(run.id),
      name: run.name || run.filename || `Run #${run.id}`,
    }))

    return NextResponse.json(list)
  } catch (err) {
    console.error('Analytics list failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to load analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
