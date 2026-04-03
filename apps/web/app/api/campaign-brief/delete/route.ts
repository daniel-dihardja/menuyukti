import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { graphqlQuery } from "@/lib/graphql/client";
import {
  DELETE_CAMPAIGN_BRIEF_MUTATION,
  type DeleteCampaignBriefData,
} from "@/lib/graphql/queries";

/**
 * DELETE /api/campaign-brief/delete
 * Body: { campaignId: number }
 */
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const campaignId = body?.campaignId;

    if (campaignId == null || !Number.isFinite(Number(campaignId))) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 }
      );
    }

    const data = await graphqlQuery<DeleteCampaignBriefData>(
      DELETE_CAMPAIGN_BRIEF_MUTATION,
      { campaignId: String(campaignId) },
      userId
    );

    if (!data.deleteCampaignBrief) {
      return NextResponse.json(
        { error: "Campaign brief not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Campaign brief delete failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to delete campaign brief";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
