import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'

const DELETE_ANALYTICS_RUN_MUTATION = `
  mutation DeleteAnalyticsRun($id: ID!) {
    deleteAnalyticsRun(analyticsRunId: $id)
  }
`

type DeleteAnalyticsRunData = {
  deleteAnalyticsRun: boolean
}

export async function DELETE(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as {
      analyticsId?: number
      locationId?: number
    } | null
    const analyticsId = Number(body?.analyticsId)
    if (!Number.isInteger(analyticsId) || analyticsId <= 0) {
      return NextResponse.json({ error: 'Invalid analyticsId' }, { status: 400 })
    }

    const data = await graphqlQuery<DeleteAnalyticsRunData>(
      DELETE_ANALYTICS_RUN_MUTATION,
      { id: String(analyticsId) },
      userId,
      'DeleteAnalyticsRun',
    )

    if (!data.deleteAnalyticsRun) {
      return NextResponse.json({ error: 'Failed to delete analytics' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
