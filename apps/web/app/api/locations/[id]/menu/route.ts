import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  LOCATION_MENU_QUERY,
  REPLACE_LOCATION_MENU_ITEMS_MUTATION,
  type LocationMenuData,
  type ReplaceLocationMenuItemsData,
} from '@/lib/graphql/queries/location-menu'

function parseLocationId(param: string): number | null {
  const value = Number(param)
  return Number.isInteger(value) && value > 0 ? value : null
}

type MenuItemBody = {
  name?: unknown
  price?: unknown
  description?: unknown
  isAvailable?: unknown
  imageFilename?: unknown
}

type MenuCategoryBody = {
  name?: unknown
  items?: unknown
}

type ParsedItem = {
  name: string
  price: number
  description?: string
  isAvailable?: boolean
  imageFilename?: string | null
}

type ParsedCategory = {
  name: string
  items: ParsedItem[]
}

function parseItems(raw: unknown): ParsedItem[] | null {
  if (!Array.isArray(raw)) return null
  const items: ParsedItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') return null
    const row = entry as MenuItemBody
    if (typeof row.name !== 'string') return null
    const price = typeof row.price === 'number' ? row.price : Number(row.price)
    if (!Number.isFinite(price)) return null
    const item: ParsedItem = { name: row.name, price }
    if (typeof row.description === 'string') item.description = row.description
    if (typeof row.isAvailable === 'boolean') item.isAvailable = row.isAvailable
    if (row.imageFilename === null) {
      item.imageFilename = null
    } else if (typeof row.imageFilename === 'string') {
      item.imageFilename = row.imageFilename
    }
    items.push(item)
  }
  return items
}

function parseCategories(raw: unknown): ParsedCategory[] | null {
  if (!Array.isArray(raw)) return null
  const categories: ParsedCategory[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') return null
    const row = entry as MenuCategoryBody
    if (typeof row.name !== 'string') return null
    const items = parseItems(row.items)
    if (!items) return null
    categories.push({ name: row.name, items })
  }
  return categories
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

    const data = await graphqlQuery<LocationMenuData>(
      LOCATION_MENU_QUERY,
      { locationId: locId },
      userId,
      'LocationMenu',
    )

    return NextResponse.json({ menu: data.locationMenu })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load location menu'
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

    const body = (await req.json().catch(() => null)) as { categories?: unknown } | null
    const categories = parseCategories(body?.categories)
    if (!categories) {
      return NextResponse.json({ message: 'Invalid categories payload' }, { status: 400 })
    }

    const data = await graphqlQuery<ReplaceLocationMenuItemsData>(
      REPLACE_LOCATION_MENU_ITEMS_MUTATION,
      { locationId: locId, categories },
      userId,
      'ReplaceLocationMenuItems',
    )

    return NextResponse.json({ menu: data.replaceLocationMenuItems })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save location menu'
    return NextResponse.json({ message }, { status: 500 })
  }
}
