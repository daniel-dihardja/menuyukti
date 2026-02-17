import { NextResponse } from "next/server";
import { loadInstagramAttribution } from "@/lib/analytics/instagram-attribution";
import {
  evaluateAttributionConfidence,
  parseConfidenceConfig,
} from "@/lib/analytics/instagram-attribution-confidence";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationIdParam = searchParams.get("locationId");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limitParam = searchParams.get("limit");
    const qualityStatus = searchParams.get("qualityStatus");
    const isStale = searchParams.get("isStale") === "true";

    if (!locationIdParam) {
      return NextResponse.json({ error: "MISSING_LOCATION_ID" }, { status: 400 });
    }

    const locationId = Number(locationIdParam);
    if (!Number.isInteger(locationId)) {
      return NextResponse.json({ error: "INVALID_LOCATION_ID" }, { status: 400 });
    }

    const from = fromParam ? new Date(fromParam) : null;
    const to = toParam ? new Date(toParam) : null;

    if (fromParam && Number.isNaN(from?.getTime())) {
      return NextResponse.json({ error: "INVALID_FROM_DATE" }, { status: 400 });
    }

    if (toParam && Number.isNaN(to?.getTime())) {
      return NextResponse.json({ error: "INVALID_TO_DATE" }, { status: 400 });
    }

    const limit = limitParam ? Number(limitParam) : 200;
    if (!Number.isInteger(limit) || limit <= 0 || limit > 2000) {
      return NextResponse.json({ error: "INVALID_LIMIT" }, { status: 400 });
    }

    const rows = await loadInstagramAttribution({
      locationId,
      from,
      to,
      limit,
    });

    const confidenceConfig = parseConfidenceConfig(searchParams);

    const items = rows.map((row) => {
      const confidence = evaluateAttributionConfidence(
        row,
        confidenceConfig,
        { qualityStatus, isStale },
      );

      return {
        ...row,
        confidence: confidence.confidence,
        sourceConfidence: confidence.sourceConfidence,
        confidenceDowngraded: confidence.downgraded,
        confidenceReasons: confidence.reasons,
        coverageRatio: confidence.coverageRatio,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Load instagram attribution mart error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
