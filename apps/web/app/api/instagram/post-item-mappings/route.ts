import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import type { UpsertInstagramPostPromotedItemsRequest } from "@/app/api/instagram/types";

function normalizeMenuName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<UpsertInstagramPostPromotedItemsRequest>;

    const locationId = Number(body.locationId);
    const instagramPostId = Number(body.instagramPostId);
    const promotedItems = Array.isArray(body.promotedItems) ? body.promotedItems : [];

    if (!Number.isInteger(locationId) || !Number.isInteger(instagramPostId)) {
      return NextResponse.json(
        { error: "locationId and instagramPostId must be valid integers" },
        { status: 400 },
      );
    }

    const normalizedItems = promotedItems
      .map((item) => ({
        canonicalMenuName: String(item?.canonicalMenuName ?? "").trim(),
      }))
      .filter((item) => item.canonicalMenuName.length > 0)
      .map((item) => ({
        canonicalMenuName: item.canonicalMenuName,
        canonicalMenuNameNorm: normalizeMenuName(item.canonicalMenuName),
      }));

    const dedupedMap = new Map<string, { canonicalMenuName: string; canonicalMenuNameNorm: string }>();
    for (const item of normalizedItems) {
      if (!dedupedMap.has(item.canonicalMenuNameNorm)) {
        dedupedMap.set(item.canonicalMenuNameNorm, item);
      }
    }
    const dedupedItems = Array.from(dedupedMap.values());

    const post = await prisma.instagramPost.findUnique({
      where: { id: instagramPostId },
      select: { id: true, locationId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Instagram post not found" }, { status: 404 });
    }

    if (post.locationId !== locationId) {
      return NextResponse.json(
        { error: "instagramPostId does not belong to the provided locationId" },
        { status: 400 },
      );
    }

    const mappings = await prisma.$transaction(async (tx) => {
      const keepNorms = dedupedItems.map((item) => item.canonicalMenuNameNorm);

      if (keepNorms.length > 0) {
        await tx.instagramPostPromotedItem.deleteMany({
          where: {
            instagramPostId,
            canonicalMenuNameNorm: {
              notIn: keepNorms,
            },
          },
        });
      } else {
        await tx.instagramPostPromotedItem.deleteMany({
          where: { instagramPostId },
        });
      }

      for (const item of dedupedItems) {
        await tx.instagramPostPromotedItem.upsert({
          where: {
            instagramPostId_canonicalMenuNameNorm: {
              instagramPostId,
              canonicalMenuNameNorm: item.canonicalMenuNameNorm,
            },
          },
          create: {
            locationId,
            instagramPostId,
            canonicalMenuName: item.canonicalMenuName,
            canonicalMenuNameNorm: item.canonicalMenuNameNorm,
            source: "manual",
          },
          update: {
            canonicalMenuName: item.canonicalMenuName,
            source: "manual",
          },
        });
      }

      return tx.instagramPostPromotedItem.findMany({
        where: { instagramPostId },
        orderBy: { canonicalMenuNameNorm: "asc" },
      });
    });

    return NextResponse.json({ mappings }, { status: 200 });
  } catch (error) {
    console.error("Upsert Instagram post item mappings error:", error);

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
