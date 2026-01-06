import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json(
        { error: "BRANCH_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const analytics = await prisma.analytics.findMany({
      where: {
        branchId: Number(branchId),
      },
      orderBy: {
        uploadedAt: "desc",
      },
      select: {
        id: true,
        sourceFile: true,
        uploadedAt: true,
      },
    });

    const result = analytics.map((a) => ({
      id: a.id,
      name: a.sourceFile ?? "Unknown file",
      uploadedAt: a.uploadedAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fetch analytics error:", error);
    return NextResponse.json(
      { error: "FETCH_ANALYTICS_FAILED" },
      { status: 500 }
    );
  }
}
