import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCachedWorkflowsByLocation } from '@/lib/graphql/cached-queries'

export async function GET(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const raw = searchParams.get('locationId')
    if (raw === null || raw === '') {
      return NextResponse.json({ message: 'locationId is required' }, { status: 400 })
    }

    const locationId = Number(raw)
    if (!Number.isFinite(locationId) || locationId < 1) {
      return NextResponse.json({ message: 'Invalid locationId' }, { status: 400 })
    }

    const nodes = await getCachedWorkflowsByLocation(userId, locationId)
    return NextResponse.json(
      { nodes },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
        },
      },
    )
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to list workflows'
    return NextResponse.json({ message }, { status: 500 })
  }
}
