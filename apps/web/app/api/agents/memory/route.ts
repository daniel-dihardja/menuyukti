import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";
import {
  appendRecommendationMemory,
  listRecentRecommendationMemory,
} from "@/lib/agents/memory-repository";

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

export async function GET(request: NextRequest) {
  const locationId = parsePositiveInt(request.nextUrl.searchParams.get("locationId"));
  const limit = parsePositiveInt(request.nextUrl.searchParams.get("limit")) ?? 20;

  if (!locationId) {
    return NextResponse.json({ error: "INVALID_LOCATION_ID" }, { status: 400 });
  }

  const events = await listRecentRecommendationMemory(prisma, {
    locationId,
    limit,
  });

  const agentsApiUrl = (process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001").replace(/\/+$/g, "");
  let memoryContext: Record<string, unknown> | null = null;
  try {
    const upstream = await fetch(`${agentsApiUrl}/agents/memory/context`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contract_version: "v1",
        location_id: locationId,
        max_items: Math.min(limit, 50),
        events: events.map((event) => ({
          id: event.id,
          version: event.version,
          recommendation_id: event.recommendationId,
          source_agent_id: event.sourceAgentId,
          state: event.state,
          rationale: event.rationale,
          execution_link: event.executionLink,
          created_at: event.createdAt,
        })),
      }),
    });
    if (upstream.ok) {
      memoryContext = (await upstream.json()) as Record<string, unknown>;
    }
  } catch {
    memoryContext = null;
  }

  return NextResponse.json({
    locationId,
    count: events.length,
    events,
    memoryContext,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    locationId?: number;
    analyticsId?: number;
    recommendationId?: string;
    sourceAgentId?: string;
    state?: "accepted" | "rejected";
    rationale?: string | null;
    executionLink?: string | null;
    outcomeLabel?: string | null;
    outcomeScore?: number | null;
  };

  if (
    !Number.isInteger(body.locationId) ||
    !Number.isInteger(body.analyticsId) ||
    typeof body.recommendationId !== "string" ||
    body.recommendationId.trim() === "" ||
    typeof body.sourceAgentId !== "string" ||
    body.sourceAgentId.trim() === "" ||
    (body.state !== "accepted" && body.state !== "rejected")
  ) {
    return NextResponse.json({ error: "INVALID_MEMORY_PAYLOAD" }, { status: 400 });
  }
  const locationId = body.locationId as number;
  const analyticsId = body.analyticsId as number;

  const event = await appendRecommendationMemory(prisma, {
    locationId,
    analyticsId,
    recommendationId: body.recommendationId.trim(),
    sourceAgentId: body.sourceAgentId.trim(),
    state: body.state,
    rationale: body.rationale ?? null,
    executionLink: body.executionLink ?? null,
    outcomeLabel: body.outcomeLabel ?? null,
    outcomeScore: typeof body.outcomeScore === "number" ? body.outcomeScore : null,
  });

  return NextResponse.json({ event });
}
