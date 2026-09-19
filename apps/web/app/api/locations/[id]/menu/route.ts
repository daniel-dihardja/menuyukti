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

type MenuModifierOptionBody = {
  name?: unknown
  priceDelta?: unknown
  isAvailable?: unknown
}

type MenuModifierGroupBody = {
  name?: unknown
  minSelect?: unknown
  maxSelect?: unknown
  options?: unknown
}

type MenuItemBody = {
  name?: unknown
  price?: unknown
  description?: unknown
  isAvailable?: unknown
  imageFilename?: unknown
  modifierGroups?: unknown
}

type MenuCategoryBody = {
  name?: unknown
  items?: unknown
}

type ParsedModifierOption = {
  name: string
  priceDelta: number
  isAvailable?: boolean
}

type ParsedModifierGroup = {
  name: string
  minSelect: number
  maxSelect: number
  options: ParsedModifierOption[]
}

type ParsedItem = {
  name: string
  price: number
  description?: string
  isAvailable?: boolean
  imageFilename?: string | null
  modifierGroups?: ParsedModifierGroup[]
}

type ParsedCategory = {
  name: string
  items: ParsedItem[]
}

function parseModifierOptions(raw: unknown): ParsedModifierOption[] | null {
  if (!Array.isArray(raw)) return null
  const options: ParsedModifierOption[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') return null
    const row = entry as MenuModifierOptionBody
    if (typeof row.name !== 'string') return null
    const priceDelta =
      row.priceDelta === undefined
        ? 0
        : typeof row.priceDelta === 'number'
          ? row.priceDelta
          : Number(row.priceDelta)
    if (!Number.isFinite(priceDelta)) return null
    const option: ParsedModifierOption = { name: row.name, priceDelta }
    if (typeof row.isAvailable === 'boolean') option.isAvailable = row.isAvailable
    options.push(option)
  }
  return options
}

function parseModifierGroups(raw: unknown): ParsedModifierGroup[] | null {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) return null
  const groups: ParsedModifierGroup[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') return null
    const row = entry as MenuModifierGroupBody
    if (typeof row.name !== 'string') return null
    const minSelect =
      row.minSelect === undefined
        ? 0
        : typeof row.minSelect === 'number'
          ? row.minSelect
          : Number(row.minSelect)
    const maxSelect =
      row.maxSelect === undefined
        ? 1
        : typeof row.maxSelect === 'number'
          ? row.maxSelect
          : Number(row.maxSelect)
    if (!Number.isInteger(minSelect) || minSelect < 0) return null
    if (!Number.isInteger(maxSelect) || maxSelect < 1) return null
    if (minSelect > maxSelect) return null
    const options = parseModifierOptions(row.options)
    if (!options) return null
    groups.push({ name: row.name, minSelect, maxSelect, options })
  }
  return groups
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
    const modifierGroups = parseModifierGroups(row.modifierGroups)
    if (modifierGroups === null) return null
    if (modifierGroups.length > 0) item.modifierGroups = modifierGroups
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
