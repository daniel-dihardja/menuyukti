import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCachedAnalyticsRunsByLocation } from '@/lib/graphql/cached-queries'

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

    const list = await getCachedAnalyticsRunsByLocation(userId, locationId)
    return NextResponse.json(list, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
      },
    })
  } catch (err) {
    console.error('Analytics list failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to load analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
