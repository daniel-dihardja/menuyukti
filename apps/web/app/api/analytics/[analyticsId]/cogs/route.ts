import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

type Params = {
  params: Promise<{
    analyticsId: string;
  }>;
};

export async function POST(req: Request, { params }: Params) {
  // 1️⃣ Unwrap params
  const { analyticsId: analyticsIdParam } = await params;
  const analyticsId = Number(analyticsIdParam);

  if (!Number.isInteger(analyticsId)) {
    return NextResponse.json(
      { message: "Invalid analytics id" },
      { status: 400 }
    );
  }

  // 2️⃣ Parse body
  const body = await req.json();

  if (!Array.isArray(body?.items)) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  // 3️⃣ Validate updates
  const updates = body.items.filter(
    (item: any) =>
      Number.isInteger(item.id) &&
      (typeof item.cogs === "number" || item.cogs === null)
  );

  if (updates.length === 0) {
    return NextResponse.json(
      { message: "No valid items to update" },
      { status: 400 }
    );
  }

  // 4️⃣ Update COGS transactionally
  await prisma.$transaction(
    updates.map((item: { id: number; cogs: number | null }) =>
      prisma.analyticsMenuItem.updateMany({
        where: {
          id: item.id,
          analyticsId,
        },
        data: {
          cogs: item.cogs,
        },
      })
    )
  );

  // 5️⃣ Fetch all menu items for matrix calculation
  const menuItems = await prisma.analyticsMenuItem.findMany({
    where: { analyticsId },
    select: {
      menuName: true,
      quantity: true,
      totalRevenue: true,
      cogs: true,
    },
  });

  if (menuItems.length === 0) {
    return NextResponse.json(
      { message: "No menu items found" },
      { status: 404 }
    );
  }

  // 6️⃣ Shape payload for analytics API
  const matrixPayload = {
    items: menuItems.map((item) => ({
      menu_name: item.menuName,
      quantity: item.quantity,
      total_revenue: Number(item.totalRevenue),
      cogs: item.cogs !== null ? Number(item.cogs) : null,
    })),
  };

  // 7️⃣ Call analytics API
  const res = await fetch(
    `${process.env.ANALYTICS_API_URL}/menu-items/matrix`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(matrixPayload),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    return NextResponse.json(
      { message: "Matrix calculation failed", detail: error },
      { status: res.status }
    );
  }

  const matrixResult = await res.json();

  // 8️⃣ Persist matrix snapshot on Analytics
  await prisma.analytics.update({
    where: { id: analyticsId },
    data: {
      matrixJson: matrixResult.matrix,
      // optional future extensions:
      // matrixDistributionJson: matrixResult.matrix.distribution,
      // avgPopularity: matrixResult.matrix.thresholds.avg_popularity,
    },
  });

  // 9️⃣ Return updated matrix
  return NextResponse.json({
    success: true,
    matrix: matrixResult.matrix,
  });
}
