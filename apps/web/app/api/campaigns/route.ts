import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import { NODES_QUERY, parseNodesData, type NodesDataRaw } from '@/lib/graphql/queries'

export async function GET(req: Request) {
  try {
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

    const data = parseNodesData(
      await graphqlQuery<NodesDataRaw>(NODES_QUERY, { locationId, nodeType: 'campaign' }, userId),
    )

    return NextResponse.json({ nodes: data.nodes })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to list workflows'
    return NextResponse.json({ message }, { status: 500 })
  }
}
