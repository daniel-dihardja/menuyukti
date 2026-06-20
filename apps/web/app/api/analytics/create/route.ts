import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { buildGraphqlUploadHeaders, getGraphqlEndpoint } from '@/lib/graphql/client'
import { revalidateLocationScopedLists } from '@/lib/graphql/revalidate-location-lists'

const UPLOAD_SALES_REPORT_MUTATION = `
  mutation UploadSalesReport($file: Upload!, $locationId: ID!, $includeLineItems: Boolean!) {
    uploadSalesReport(file: $file, locationId: $locationId, includeLineItems: $includeLineItems) {
      filename
      sizeBytes
    }
  }
`

/**
 * POST /api/analytics/create
 * Body: multipart/form-data with `file` (.xlsx) and `locationId` (integer).
 */
export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const locationIdRaw = formData.get('locationId')
    const file = formData.get('file')

    const locationId = Number(locationIdRaw)
    if (!Number.isInteger(locationId) || locationId <= 0) {
      return NextResponse.json({ error: 'Invalid locationId' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an .xlsx file.' },
        { status: 400 },
      )
    }

    const operations = JSON.stringify({
      query: UPLOAD_SALES_REPORT_MUTATION,
      variables: {
        file: null,
        locationId: String(locationId),
        includeLineItems: false,
      },
      operationName: 'UploadSalesReport',
    })
    const map = JSON.stringify({ '0': ['variables.file'] })

    const graphqlBody = new FormData()
    graphqlBody.set('operations', operations)
    graphqlBody.set('map', map)
    graphqlBody.set('0', file, file.name)

    const res = await fetch(getGraphqlEndpoint(), {
      method: 'POST',
      headers: buildGraphqlUploadHeaders(userId),
      body: graphqlBody,
    })

    const text = await res.text()
    let payload: { data?: unknown; errors?: Array<{ message?: string }> } | null = null
    try {
      payload = text
        ? (JSON.parse(text) as { data?: unknown; errors?: Array<{ message?: string }> })
        : null
    } catch {
      payload = null
    }

    if (!res.ok) {
      const message =
        payload?.errors
          ?.map((e) => e.message)
          .filter(Boolean)
          .join('; ') ||
        text ||
        `GraphQL upload failed: ${res.status}`
      return NextResponse.json({ error: message }, { status: 500 })
    }

    if (payload?.errors?.length) {
      const message = payload.errors
        .map((e) => e.message)
        .filter(Boolean)
        .join('; ')
      return NextResponse.json({ error: message || 'Upload failed' }, { status: 500 })
    }

    revalidateLocationScopedLists(userId, locationId)

    return NextResponse.json({ status: 'ok', pos: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
