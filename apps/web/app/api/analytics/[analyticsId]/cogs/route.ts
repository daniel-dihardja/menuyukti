import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import { revalidateAnalyticsRunComputationsCache } from '@/lib/graphql/revalidate-analytics-cache'

const ANALYTICS_RUN_COGS_QUERY = `
  query AnalyticsRunCogs($id: ID!) {
    analyticsRun(id: $id) {
      id
      menuItemCogs {
        id
        menu
        menuCategory
        menuCategoryDetail
        cogs
        currency
      }
    }
  }
`

const UPSERT_MENU_ITEM_COGS_BULK_MUTATION = `
  mutation UpsertMenuItemCogsBulk($analyticsRunId: ID!, $items: [MenuItemCogsUpsertInput!]!) {
    upsertMenuItemCogsBulk(analyticsRunId: $analyticsRunId, items: $items) {
      id
      menu
      cogs
      menuCategory
      menuCategoryDetail
      currency
    }
  }
`

const APPLY_LOCATION_COGS_MUTATION = `
  mutation ApplyLocationCogsToAnalyticsRun($analyticsRunId: ID!) {
    applyLocationCogsToAnalyticsRun(analyticsRunId: $analyticsRunId) {
      id
      menu
      cogs
    }
  }
`

const SAVE_RUN_COGS_TO_LOCATION_MUTATION = `
  mutation SaveAnalyticsRunCogsToLocation($analyticsRunId: ID!) {
    saveAnalyticsRunCogsToLocation(analyticsRunId: $analyticsRunId) {
      id
      menu
      cogs
    }
  }
`

type AnalyticsRunCogsData = {
  analyticsRun: {
    id: string
    menuItemCogs: Array<{
      id: number
      menu: string
      menuCategory: string | null
      menuCategoryDetail: string | null
      cogs: number
      currency: string | null
    }>
  } | null
}

type UpsertMenuItemCogsData = {
  upsertMenuItemCogsBulk: Array<{
    id: number
    menu: string
    cogs: number
  }>
}

function parseAnalyticsId(param: string): number | null {
  const value = Number(param)
  return Number.isInteger(value) && value > 0 ? value : null
}

export async function GET(_: Request, { params }: { params: Promise<{ analyticsId: string }> }) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { analyticsId } = await params
    const runId = parseAnalyticsId(analyticsId)
    if (!runId) {
      return NextResponse.json({ error: 'Invalid analyticsId' }, { status: 400 })
    }

    const data = await graphqlQuery<AnalyticsRunCogsData>(
      ANALYTICS_RUN_COGS_QUERY,
      { id: String(runId) },
      userId,
      'AnalyticsRunCogs',
    )

    const rows = data.analyticsRun?.menuItemCogs ?? []
    return NextResponse.json({
      items: rows.map((row) => ({
        id: row.id,
        menuName: row.menu,
        cogs: row.cogs,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load COGS'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ analyticsId: string }> }) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { analyticsId } = await params
    const runId = parseAnalyticsId(analyticsId)
    if (!runId) {
      return NextResponse.json({ message: 'Invalid analyticsId' }, { status: 400 })
    }

    const body = (await req.json().catch(() => null)) as {
      action?: string
      items?: Array<{
        menuName?: string
        cogs?: number | null
        menuCategory?: string | null
      }>
    } | null

    if (body?.action === 'applyFromLocation') {
      const data = await graphqlQuery<{
        applyLocationCogsToAnalyticsRun: Array<{ id: number }>
      }>(
        APPLY_LOCATION_COGS_MUTATION,
        { analyticsRunId: String(runId) },
        userId,
        'ApplyLocationCogsToAnalyticsRun',
      )
      revalidateAnalyticsRunComputationsCache(userId, String(runId))
      return NextResponse.json({
        ok: true,
        updated: data.applyLocationCogsToAnalyticsRun.length,
      })
    }

    if (body?.action === 'saveToLocation') {
      const data = await graphqlQuery<{
        saveAnalyticsRunCogsToLocation: Array<{ id: number }>
      }>(
        SAVE_RUN_COGS_TO_LOCATION_MUTATION,
        { analyticsRunId: String(runId) },
        userId,
        'SaveAnalyticsRunCogsToLocation',
      )
      return NextResponse.json({
        ok: true,
        updated: data.saveAnalyticsRunCogsToLocation.length,
      })
    }

    const inputItems = body?.items ?? []
    const items = inputItems
      .filter(
        (item): item is { menuName: string; cogs: number; menuCategory?: string | null } =>
          typeof item.menuName === 'string' &&
          item.menuName.trim().length > 0 &&
          typeof item.cogs === 'number' &&
          Number.isFinite(item.cogs),
      )
      .map((item) => ({
        menuName: item.menuName.trim(),
        cogs: item.cogs,
        menuCategory: item.menuCategory ?? null,
        menuCategoryDetail: item.menuCategory ?? null,
        currency: 'IDR',
      }))

    if (items.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 })
    }

    const data = await graphqlQuery<UpsertMenuItemCogsData>(
      UPSERT_MENU_ITEM_COGS_BULK_MUTATION,
      { analyticsRunId: String(runId), items },
      userId,
      'UpsertMenuItemCogsBulk',
    )
    revalidateAnalyticsRunComputationsCache(userId, String(runId))

    return NextResponse.json({ ok: true, updated: data.upsertMenuItemCogsBulk.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update COGS'
    return NextResponse.json({ message }, { status: 500 })
  }
}
