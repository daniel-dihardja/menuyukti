import { prisma } from "@/lib/prisma/client";

type Params = {
  analyticsId: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  try {
    const { analyticsId: analyticsIdParam } = await params;
    const analyticsId = Number(analyticsIdParam);

    if (!Number.isInteger(analyticsId)) {
      return Response.json(
        { message: "Invalid analytics id" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as { name?: string };
    const name = body?.name?.trim();

    if (!name) {
      return Response.json(
        { message: "Name is required" },
        { status: 400 },
      );
    }

    const analytics = await prisma.analytics.update({
      where: { id: analyticsId },
      data: { sourceFile: name },
      select: { id: true, sourceFile: true },
    });

    return Response.json({ id: analytics.id, name: analytics.sourceFile });
  } catch (error) {
    console.error("Rename analytics error:", error);
    return Response.json(
      { message: "RENAME_ANALYTICS_FAILED" },
      { status: 500 },
    );
  }
}
