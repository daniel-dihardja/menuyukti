import { getAppCurrencyCode } from '@/lib/app-currency'
import { graphqlQuery } from '@/lib/graphql/client'
import { getCachedMenuEngineeringMatrix } from '@/lib/graphql/cached-queries'
import {
  ANALYTICS_RUN_QUERY,
  MENU_ITEMS_CATALOG_FOR_RUN_QUERY,
  type AnalyticsRunData,
  type MenuItemsCatalogForRunData,
} from '@/lib/graphql/queries'

export type CogsEditorItem = {
  id: number
  menuName: string
  cogs: number | null
  quantity: number
  totalRevenue: number
  price: number
  menuCategory: string | null
}

export type MenuEngineeringMatrixRowInput = {
  menu: string
  quantity: number
  totalRevenue: number
  menuCategory?: string | null
}

export type MenuItemCogsRowInput = {
  id: number
  menu: string
  cogs: number
  menuCategory?: string | null
}

export type MenuCatalogItemInput = {
  id: string
  name: string
  category: string
  price: number
  quantity: number
}

/**
 * Merge matrix rows, saved COGS, and optional catalog fallback into editor rows.
 * Pure helper for tests and shared by the async builder.
 */
export function mergeCogsEditorItems(args: {
  analyticsRunId: string
  matrixItems: MenuEngineeringMatrixRowInput[]
  menuItemCogs: MenuItemCogsRowInput[]
  catalog: { analyticsRunId: string; items: MenuCatalogItemInput[] } | null
}): CogsEditorItem[] {
  const { analyticsRunId, matrixItems, menuItemCogs, catalog } = args

  const byMenu = new Map(
    matrixItems.map((row) => [
      row.menu,
      {
        menuName: row.menu,
        quantity: row.quantity,
        totalRevenue: row.totalRevenue,
        price: row.quantity > 0 ? row.totalRevenue / row.quantity : 0,
        menuCategory: row.menuCategory ?? null,
      },
    ]),
  )

  const cogsByMenu = new Map(menuItemCogs.map((cog) => [cog.menu, cog]))

  let menuItems: CogsEditorItem[] = Array.from(byMenu.values())
    .map((row, index) => {
      const existing = cogsByMenu.get(row.menuName)
      return {
        id: existing?.id ?? -(index + 1),
        menuName: row.menuName,
        cogs: existing?.cogs ?? null,
        quantity: row.quantity,
        totalRevenue: row.totalRevenue,
        price: row.price,
        menuCategory: existing?.menuCategory ?? row.menuCategory,
      }
    })
    .concat(
      menuItemCogs
        .filter((cog) => !byMenu.has(cog.menu))
        .map((cog) => ({
          id: cog.id,
          menuName: cog.menu,
          cogs: cog.cogs,
          quantity: 0,
          totalRevenue: 0,
          price: 0,
          menuCategory: cog.menuCategory ?? null,
        })),
    )

  if (menuItems.length === 0 && catalog && catalog.analyticsRunId === analyticsRunId) {
    menuItems = catalog.items.map((item, index) => {
      const parsedId = Number(item.id)
      return {
        id: Number.isFinite(parsedId) ? parsedId : -(index + 1),
        menuName: item.name,
        cogs: cogsByMenu.get(item.name)?.cogs ?? null,
        quantity: item.quantity,
        totalRevenue: item.price * item.quantity,
        price: item.price,
        menuCategory: item.category || null,
      }
    })
  }

  return menuItems.toSorted((a, b) => a.menuName.localeCompare(b.menuName))
}

export type BuildCogsEditorItemsResult = {
  items: CogsEditorItem[]
  currencyCode: string
  locationId: number
}

/**
 * Load an analytics run and build editable COGS rows (matrix → COGS → catalog).
 * Returns null when the run does not exist.
 */
export async function buildCogsEditorItems(
  userId: string,
  analyticsRunId: number,
): Promise<BuildCogsEditorItemsResult | null> {
  const id = String(analyticsRunId)
  const runData = await graphqlQuery<AnalyticsRunData>(
    ANALYTICS_RUN_QUERY,
    { id },
    userId,
    'AnalyticsRun',
  )
  const run = runData.analyticsRun
  if (!run) return null

  const locationId = String(run.locationId)
  const [matrixData, menuCatalogData] = await Promise.all([
    getCachedMenuEngineeringMatrix(userId, id, locationId),
    graphqlQuery<MenuItemsCatalogForRunData>(
      MENU_ITEMS_CATALOG_FOR_RUN_QUERY,
      { analyticsRunId: id },
      userId,
      'MenuItemsCatalogForRun',
    ),
  ])

  const catalogPayload = menuCatalogData.menuItemsCatalogForRun
  const items = mergeCogsEditorItems({
    analyticsRunId: id,
    matrixItems: matrixData.menuEngineeringMatrix?.items ?? [],
    menuItemCogs: run.menuItemCogs.map((cog) => ({
      id: cog.id,
      menu: cog.menu,
      cogs: cog.cogs,
      menuCategory: cog.menuCategory,
    })),
    catalog: catalogPayload
      ? {
          analyticsRunId: catalogPayload.analyticsRunId,
          items: catalogPayload.items,
        }
      : null,
  })

  return {
    items,
    currencyCode: getAppCurrencyCode(),
    locationId: Number(run.locationId),
  }
}
