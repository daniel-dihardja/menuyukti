import { NextResponse } from "next/server";
import { graphqlQuery } from "@/lib/graphql/client";
import {
  DELETE_CAMPAIGN_MUTATION,
  type DeleteCampaignData,
} from "@/lib/graphql/queries";

/**
 * DELETE /api/campaigns/delete
 * Body: { id: number }
 */
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const id = body?.id;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const data = await graphqlQuery<DeleteCampaignData>(
      DELETE_CAMPAIGN_MUTATION,
      { id: String(id) }
    );

    if (!data.deleteCampaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Campaign delete failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to delete campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
