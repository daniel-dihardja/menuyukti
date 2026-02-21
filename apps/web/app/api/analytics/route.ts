import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    const analytics = await prisma.analytics.findMany({
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        menuItems: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    const formatted = analytics.map((item) => ({
      id: item.id,
      locationId: item.locationId,
      locationName: item.location.name,
      sourceFile: item.sourceFile,
      uploadedAt: item.uploadedAt,
      itemCount: item.menuItems.length,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
