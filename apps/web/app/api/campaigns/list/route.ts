import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { graphqlQuery } from "@/lib/graphql/client";
import {
  CAMPAIGNS_BY_LOCATION_QUERY,
  type CampaignsByLocationData,
} from "@/lib/graphql/queries";

/**
 * GET /api/campaigns/list?locationId=...
 * Returns campaigns for the location from GraphQL.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const locationIdParam = searchParams.get("locationId");
    const locationId = locationIdParam ? Number(locationIdParam) : null;

    if (locationId == null || !Number.isInteger(locationId)) {
      return NextResponse.json(
        { error: "locationId is required and must be an integer" },
        { status: 400 }
      );
    }

    const data = await graphqlQuery<CampaignsByLocationData>(
      CAMPAIGNS_BY_LOCATION_QUERY,
      { locationId },
      userId
    );

    const campaigns = (data.campaigns ?? []).map((c) => ({
      id: Number(c.id),
      name: c.name,
      status: c.status,
      startDate: c.startDate ?? null,
      endDate: c.endDate ?? null,
      goal: c.goal ?? null,
    }));

    return NextResponse.json(campaigns);
  } catch (err) {
    console.error("Campaigns list failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to load campaigns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
