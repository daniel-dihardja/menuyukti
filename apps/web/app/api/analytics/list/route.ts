import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCachedAnalyticsRunsByLocation } from '@/lib/graphql/cached-queries'

function isPrerenderInterrupt(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const digest = (error as Error & { digest?: string }).digest
  return digest === 'NEXT_PRERENDER_INTERRUPTED' || digest === 'HANGING_PROMISE_REJECTION'
}

/**
 * GET /api/analytics/list?locationId=...
 * Returns analytics runs for the location from GraphQL (no Prisma).
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
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Analytics list failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to load analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
