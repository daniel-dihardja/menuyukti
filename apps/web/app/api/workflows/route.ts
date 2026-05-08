import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCachedWorkflowsByLocation } from '@/lib/graphql/cached-queries'

function isPrerenderInterrupt(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const digest = (error as Error & { digest?: string }).digest
  return digest === 'NEXT_PRERENDER_INTERRUPTED' || digest === 'HANGING_PROMISE_REJECTION'
}

export async function GET(req: Request) {
  try {
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
          // List mutates via create/delete; avoid browser caching stale rows alongside Data Cache.
          'Cache-Control': 'private, no-store',
        },
      },
    )
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to list workflows'
    return NextResponse.json({ message }, { status: 500 })
  }
}
