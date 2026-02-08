import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

type DeleteAnalyticsPayload = {
  analyticsId: number;
  branchId: number;
};

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as Partial<DeleteAnalyticsPayload>;

    const { analyticsId, branchId } = body;

    if (!analyticsId || !branchId) {
      return NextResponse.json(
        { error: "ANALYTICS_ID_AND_BRANCH_ID_REQUIRED" },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // Verify analytics belongs to branch
    // --------------------------------------------------
    const analytics = await prisma.analytics.findFirst({
      where: {
        id: analyticsId,
        branchId,
      },
      select: { id: true },
    });

    if (!analytics) {
      return NextResponse.json(
        { error: "ANALYTICS_NOT_FOUND_FOR_BRANCH" },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // Delete analytics (menu items cascade automatically)
    // --------------------------------------------------
    await prisma.analytics.delete({
      where: { id: analyticsId },
    });

    return NextResponse.json({
      status: "ok",
      deletedAnalyticsId: analyticsId,
    });
  } catch (error) {
    console.error("Delete analytics error:", error);

    return NextResponse.json(
      { error: "DELETE_ANALYTICS_FAILED" },
      { status: 500 },
    );
  }
}
