import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'

const LOCATION_MENU_ITEM_COGS_QUERY = `
  query LocationMenuItemCogs($locationId: ID!) {
    locationMenuItemCogs(locationId: $locationId) {
      id
      menu
      menuCategory
      menuCategoryDetail
      cogs
      currency
    }
  }
`

const UPSERT_LOCATION_MENU_ITEM_COGS_BULK_MUTATION = `
  mutation UpsertLocationMenuItemCogsBulk(
    $locationId: ID!
    $items: [LocationMenuItemCogsUpsertInput!]!
  ) {
    upsertLocationMenuItemCogsBulk(locationId: $locationId, items: $items) {
      id
      menu
      cogs
      menuCategory
      menuCategoryDetail
      currency
    }
  }
`

const SAVE_ANALYTICS_RUN_COGS_TO_LOCATION_MUTATION = `
  mutation SaveAnalyticsRunCogsToLocation($analyticsRunId: ID!) {
    saveAnalyticsRunCogsToLocation(analyticsRunId: $analyticsRunId) {
      id
      menu
      cogs
    }
  }
`

type LocationCogsData = {
  locationMenuItemCogs: Array<{
    id: number
    menu: string
    menuCategory: string | null
    menuCategoryDetail: string | null
    cogs: number
    currency: string | null
  }>
}

type UpsertLocationCogsData = {
  upsertLocationMenuItemCogsBulk: Array<{ id: number; menu: string; cogs: number }>
}

type SaveRunCogsData = {
  saveAnalyticsRunCogsToLocation: Array<{ id: number; menu: string; cogs: number }>
}

function parseLocationId(param: string): number | null {
  const value = Number(param)
  return Number.isInteger(value) && value > 0 ? value : null
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const locId = parseLocationId(id)
    if (!locId) {
      return NextResponse.json({ error: 'Invalid locationId' }, { status: 400 })
    }

    const data = await graphqlQuery<LocationCogsData>(
      LOCATION_MENU_ITEM_COGS_QUERY,
      { locationId: String(locId) },
      userId,
      'LocationMenuItemCogs',
    )

    return NextResponse.json({
      items: data.locationMenuItemCogs.map((row) => ({
        id: row.id,
        menuName: row.menu,
        menuCategory: row.menuCategory,
        cogs: row.cogs,
        currency: row.currency,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load location COGS'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const locId = parseLocationId(id)
    if (!locId) {
      return NextResponse.json({ message: 'Invalid locationId' }, { status: 400 })
    }

    const body = (await req.json().catch(() => null)) as {
      action?: string
      analyticsRunId?: number | string
      currency?: string | null
      items?: Array<{
        menuName?: string
        cogs?: number | null
        menuCategory?: string | null
        currency?: string | null
      }>
    } | null

    if (body?.action === 'importFromRun') {
      const runId = Number(body.analyticsRunId)
      if (!Number.isInteger(runId) || runId < 1) {
        return NextResponse.json({ message: 'Invalid analyticsRunId' }, { status: 400 })
      }
      const data = await graphqlQuery<SaveRunCogsData>(
        SAVE_ANALYTICS_RUN_COGS_TO_LOCATION_MUTATION,
        { analyticsRunId: String(runId) },
        userId,
        'SaveAnalyticsRunCogsToLocation',
      )
      return NextResponse.json({
        ok: true,
        updated: data.saveAnalyticsRunCogsToLocation.length,
      })
    }

    const fallbackCurrency =
      typeof body?.currency === 'string' && body.currency.trim().length > 0
        ? body.currency.trim().toUpperCase()
        : null

    const inputItems = body?.items ?? []
    const items = inputItems
      .filter(
        (
          item,
        ): item is {
          menuName: string
          cogs: number
          menuCategory?: string | null
          currency?: string | null
        } =>
          typeof item.menuName === 'string' &&
          item.menuName.trim().length > 0 &&
          typeof item.cogs === 'number' &&
          Number.isFinite(item.cogs),
      )
      .map((item) => {
        const itemCurrency =
          typeof item.currency === 'string' && item.currency.trim().length > 0
            ? item.currency.trim().toUpperCase()
            : fallbackCurrency
        return {
          menuName: item.menuName.trim(),
          cogs: item.cogs,
          menuCategory: item.menuCategory ?? null,
          menuCategoryDetail: item.menuCategory ?? null,
          currency: itemCurrency,
        }
      })

    if (items.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 })
    }

    const data = await graphqlQuery<UpsertLocationCogsData>(
      UPSERT_LOCATION_MENU_ITEM_COGS_BULK_MUTATION,
      { locationId: String(locId), items },
      userId,
      'UpsertLocationMenuItemCogsBulk',
    )

    return NextResponse.json({ ok: true, updated: data.upsertLocationMenuItemCogsBulk.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update location COGS'
    return NextResponse.json({ message }, { status: 500 })
  }
}
