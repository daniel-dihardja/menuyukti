import { NextResponse } from 'next/server'

import { GraphQLRequestError } from '@/lib/graphql/client'
import { loadPublicLocationWall } from '@/lib/public-wall/load-public-wall'

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { slug: rawSlug } = await context.params
    const wall = await loadPublicLocationWall(decodeURIComponent(rawSlug ?? ''))
    if (!wall) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(wall, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    console.error('[public/wall] GET', error)
    return NextResponse.json({ message: 'Failed to load wall' }, { status: 500 })
  }
}
