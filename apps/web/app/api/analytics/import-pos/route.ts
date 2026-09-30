import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import { revalidateLocationScopedLists } from '@/lib/graphql/revalidate-location-lists'

const IMPORT_POS_SALES_REPORT_MUTATION = `
  mutation ImportPosSalesReport($locationId: ID!, $startDate: Date!, $endDate: Date!) {
    importPosSalesReport(locationId: $locationId, startDate: $startDate, endDate: $endDate) {
      analyticsRunId
      name
      orderCount
      lineCount
    }
  }
`

type ImportPosSalesReportData = {
  importPosSalesReport: {
    analyticsRunId: string
    name: string
    orderCount: number
    lineCount: number
  }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false
  const parsed = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed)
}

/**
 * POST /api/analytics/import-pos
 * Body: JSON `{ locationId, startDate, endDate }` (ISO dates `yyyy-MM-dd`).
 */
export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as {
      locationId?: number | string
      startDate?: string
      endDate?: string
    } | null

    const locationId = Number(body?.locationId)
    if (!Number.isInteger(locationId) || locationId <= 0) {
      return NextResponse.json({ error: 'Invalid locationId' }, { status: 400 })
    }
    if (!isIsoDate(body?.startDate) || !isIsoDate(body?.endDate)) {
      return NextResponse.json(
        { error: 'startDate and endDate must be ISO dates (yyyy-MM-dd)' },
        { status: 400 },
      )
    }
    if (body.startDate > body.endDate) {
      return NextResponse.json({ error: 'startDate must be on or before endDate' }, { status: 400 })
    }

    const data = await graphqlQuery<ImportPosSalesReportData>(
      IMPORT_POS_SALES_REPORT_MUTATION,
      {
        locationId: String(locationId),
        startDate: body.startDate,
        endDate: body.endDate,
      },
      userId,
      'ImportPosSalesReport',
    )

    const result = data.importPosSalesReport
    revalidateLocationScopedLists(userId, locationId)

    return NextResponse.json({
      analyticsRunId: Number(result.analyticsRunId),
      name: result.name,
      orderCount: result.orderCount,
      lineCount: result.lineCount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to import POS sales'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
