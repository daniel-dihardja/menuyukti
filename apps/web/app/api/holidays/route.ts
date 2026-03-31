import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { graphqlQuery } from "@/lib/graphql/client";
import {
  LOCATION_QUERY,
  PUBLIC_HOLIDAYS_QUERY,
  type LocationData,
  type PublicHolidaysData,
  type PublicHolidayItem,
} from "@/lib/graphql/queries";

/**
 * GET /api/holidays?locationId=123&dateStart=2026-04-01&dateEnd=2026-04-30
 *
 * 1. Resolve country from location
 * 2. Fetch public holidays from GraphQL for that country + date range
 * 3. Return { holidays: PublicHolidayItem[] }
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const locationIdParam = searchParams.get("locationId");
    const dateStart = searchParams.get("dateStart");
    const dateEnd = searchParams.get("dateEnd");

    if (!locationIdParam || !dateStart || !dateEnd) {
      return NextResponse.json(
        { error: "locationId, dateStart, and dateEnd are required" },
        { status: 400 }
      );
    }

    const locationId = Number(locationIdParam);
    if (!Number.isInteger(locationId) || isNaN(locationId)) {
      return NextResponse.json(
        { error: "locationId must be an integer" },
        { status: 400 }
      );
    }

    const locationData = await graphqlQuery<LocationData>(
      LOCATION_QUERY,
      {
        id: String(locationId),
      },
      userId,
    );

    const country = locationData.location?.country;
    if (!country) {
      return NextResponse.json(
        { error: "Could not determine country for this location" },
        { status: 422 }
      );
    }

    const holidaysData = await graphqlQuery<PublicHolidaysData>(
      PUBLIC_HOLIDAYS_QUERY,
      { country, startDate: dateStart, endDate: dateEnd },
      userId,
    );

    const holidays: PublicHolidayItem[] = holidaysData.publicHolidays ?? [];

    return NextResponse.json({ holidays });
  } catch (err) {
    console.error("Holidays fetch failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to load holidays";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
