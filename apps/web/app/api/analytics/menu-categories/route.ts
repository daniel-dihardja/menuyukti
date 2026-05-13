import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import { aggregateMenuCategoriesFromCatalogItems } from '@/lib/analytics/menu-categories'
import {
  MENU_ITEMS_CATALOG_FOR_RUN_QUERY,
  MENU_ITEMS_CATALOG_QUERY,
  type MenuItemsCatalogData,
  type MenuItemsCatalogForRunData,
} from '@/lib/graphql/queries'

function isPrerenderInterrupt(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const digest = (error as Error & { digest?: string }).digest
  return digest === 'NEXT_PRERENDER_INTERRUPTED' || digest === 'HANGING_PROMISE_REJECTION'
}

/**
 * GET /api/analytics/menu-categories?locationId=...&analyticsRunId=...
 * Distinct POS menu categories with item counts for milestone input pickers.
 */
export async function GET(req: Request) {
  try {
    await connection()
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
    const locationIdParam = searchParams.get('locationId')
    const locationId = locationIdParam ? Number(locationIdParam) : null
    const analyticsRunIdParam = searchParams.get('analyticsRunId')
    const analyticsRunId =
      analyticsRunIdParam && /^\d+$/.test(analyticsRunIdParam) ? analyticsRunIdParam : null

    if (locationId == null || !Number.isInteger(locationId)) {
      return NextResponse.json(
        { error: 'locationId is required and must be an integer' },
        { status: 400 },
      )
    }

    let payload: { analyticsRunId: string; items: Array<{ category: string }> } | null = null

    if (analyticsRunId) {
      const data = await graphqlQuery<MenuItemsCatalogForRunData>(
        MENU_ITEMS_CATALOG_FOR_RUN_QUERY,
        { analyticsRunId },
        userId,
      )
      payload = data.menuItemsCatalogForRun
    } else {
      const data = await graphqlQuery<MenuItemsCatalogData>(
        MENU_ITEMS_CATALOG_QUERY,
        { locationId },
        userId,
      )
      payload = data.menuItemsCatalog
    }

    if (!payload) {
      return NextResponse.json(
        { analyticsRunId: null, categories: [] },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json(
      {
        analyticsRunId: payload.analyticsRunId,
        categories: aggregateMenuCategoriesFromCatalogItems(payload.items),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[api/analytics/menu-categories]', error)
    return NextResponse.json({ error: 'Failed to load menu categories' }, { status: 500 })
  }
}
