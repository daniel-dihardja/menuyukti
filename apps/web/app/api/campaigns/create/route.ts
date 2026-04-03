import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { graphqlQuery } from "@/lib/graphql/client";
import {
  CREATE_CAMPAIGN_MUTATION,
  type CreateCampaignData,
} from "@/lib/graphql/queries";

function generateCampaignName(): string {
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  const suffix = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `Campaign — ${month} ${year} ${suffix}`;
}

/**
 * POST /api/campaigns/create
 * Body: { locationId: number }
 * Creates a draft campaign with a generated name and returns { id, name }.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rawLocationId =
      body &&
      typeof body === "object" &&
      "locationId" in body
        ? (body as { locationId: unknown }).locationId
        : undefined;
    const locationId =
      typeof rawLocationId === "number"
        ? rawLocationId
        : typeof rawLocationId === "string"
          ? Number(rawLocationId)
          : NaN;

    if (!Number.isInteger(locationId)) {
      return NextResponse.json(
        { error: "locationId is required and must be an integer" },
        { status: 400 }
      );
    }

    const name = generateCampaignName();

    const data = await graphqlQuery<CreateCampaignData>(
      CREATE_CAMPAIGN_MUTATION,
      { locationId, name },
      userId
    );

    const created = data.createCampaign;
    if (!created?.id) {
      return NextResponse.json(
        { error: "Campaign was not created" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: Number(created.id),
      name: created.name,
    });
  } catch (err) {
    console.error("Campaign create failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
