import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCachedWorkflowsByLocation } from '@/lib/graphql/cached-queries'

export async function GET(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
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
          'Cache-Control': 'private, no-store',
        },
      },
    )
  } catch (err) {
    console.error('Workflows list failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to load workflows'
    return NextResponse.json({ message }, { status: 500 })
  }
}
