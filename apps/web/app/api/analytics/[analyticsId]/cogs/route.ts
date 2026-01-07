import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

type Params = {
  params: Promise<{
    analyticsId: string;
  }>;
};

export async function POST(req: Request, { params }: Params) {
  // 1️⃣ Unwrap params (Next.js 15+)
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

  if (!body?.items || !Array.isArray(body.items)) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  // 3️⃣ Validate items
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

  // 4️⃣ Transactional update
  await prisma.$transaction(
    updates.map((item: { id: number; cogs: number | null }) =>
      prisma.analyticsMenuItem.updateMany({
        where: {
          id: item.id,
          analyticsId, // 🔐 safety: enforce scope
        },
        data: {
          cogs: item.cogs,
        },
      })
    )
  );

  return NextResponse.json({ success: true });
}
