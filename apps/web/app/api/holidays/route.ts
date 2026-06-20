import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCachedLocation, getCachedPublicHolidays } from '@/lib/graphql/cached-queries'
import { type PublicHolidayItem } from '@/lib/graphql/queries'
import {
  countryIdToPublicHolidayId,
  resolveCountryIdFromName,
} from '@/lib/locations/country-config'

/**
 * GET /api/holidays?locationId=123&dateStart=2026-04-01&dateEnd=2026-04-30
 *
 * 1. Resolve country from location
 * 2. Fetch public holidays from GraphQL for that country + date range
 * 3. Return { holidays: PublicHolidayItem[] }
 */
export async function GET(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)

    const locationIdParam = searchParams.get('locationId')
    const dateStart = searchParams.get('dateStart')
    const dateEnd = searchParams.get('dateEnd')

    if (!locationIdParam || !dateStart || !dateEnd) {
      return NextResponse.json(
        { error: 'locationId, dateStart, and dateEnd are required' },
        { status: 400 },
      )
    }

    const locationId = Number(locationIdParam)
    if (!Number.isInteger(locationId) || isNaN(locationId)) {
      return NextResponse.json({ error: 'locationId must be an integer' }, { status: 400 })
    }

    const locationData = await getCachedLocation(userId, String(locationId))

    const country = locationData.location?.country
    const countryId = resolveCountryIdFromName(country)
    if (!countryId) {
      return NextResponse.json(
        { error: 'Could not determine supported country for this location' },
        { status: 422 },
      )
    }
    const publicHolidayId = countryIdToPublicHolidayId[countryId]
    if (!publicHolidayId) {
      return NextResponse.json(
        { error: 'Could not resolve public holiday country id' },
        { status: 422 },
      )
    }

    const holidaysData = await getCachedPublicHolidays(userId, publicHolidayId, dateStart, dateEnd)

    const holidays: PublicHolidayItem[] = holidaysData.publicHolidays ?? []

    return NextResponse.json({ holidays })
  } catch (err) {
    console.error('Holidays fetch failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to load holidays'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
