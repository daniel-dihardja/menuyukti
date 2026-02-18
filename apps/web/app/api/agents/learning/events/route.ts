import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";
import {
  appendLearningSignalEvent,
  buildLearningLinkageKey,
  listLearningSignalEvents,
  type LearningSignalEvent,
} from "@/lib/agents/learning-repository";

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

async function evaluateEligibility(events: LearningSignalEvent[]) {
  const agentsApiUrl = (process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001").replace(/\/+$/g, "");
  const response = await fetch(`${agentsApiUrl}/agents/learning/eligibility`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contract_version: "v1",
      events: events.map((event) => ({
        linkage_key: event.linkageKey,
        signal_type: event.signalType,
        outcome_delta_revenue: event.outcomeDeltaRevenue,
        outcome_delta_qty: event.outcomeDeltaQty,
        outcome_confidence: event.outcomeConfidence,
        sample_size: event.sampleSize,
      })),
    }),
  });
  if (!response.ok) {
    throw new Error("LEARNING_ELIGIBILITY_SERVICE_UNAVAILABLE");
  }
  return (await response.json()) as {
    eligibility?: Array<{
      linkage_key: string;
      signal_type: string;
      eligible: boolean;
      reasons: string[];
    }>;
  };
}

export async function GET(request: NextRequest) {
  const locationId = parsePositiveInt(request.nextUrl.searchParams.get("locationId"));
  const analyticsId = parsePositiveInt(request.nextUrl.searchParams.get("analyticsId"));
  const limit = parsePositiveInt(request.nextUrl.searchParams.get("limit")) ?? 50;
  const eligibleOnly = request.nextUrl.searchParams.get("eligibleOnly") === "true";

  if (!locationId) {
    return NextResponse.json({ error: "INVALID_LOCATION_ID" }, { status: 400 });
  }

  const events = await listLearningSignalEvents(prisma, {
    locationId,
    analyticsId: analyticsId ?? undefined,
    eligibleOnly,
    limit,
  });

  return NextResponse.json({
    locationId,
    analyticsId: analyticsId ?? null,
    count: events.length,
    events,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    locationId?: number;
    analyticsId?: number;
    persona?: "marketer" | "analyst";
    sourceAgentId?: string;
    recommendationId?: string;
    signalType?: LearningSignalEvent["signalType"];
    decisionState?: LearningSignalEvent["decisionState"];
    executionState?: LearningSignalEvent["executionState"];
    outcomeDeltaRevenue?: number | null;
    outcomeDeltaQty?: number | null;
    outcomeConfidence?: LearningSignalEvent["outcomeConfidence"];
    sampleSize?: number | null;
  };

  if (
    !Number.isInteger(body.locationId) ||
    !Number.isInteger(body.analyticsId) ||
    (body.persona !== "marketer" && body.persona !== "analyst") ||
    typeof body.sourceAgentId !== "string" ||
    body.sourceAgentId.trim() === "" ||
    typeof body.recommendationId !== "string" ||
    body.recommendationId.trim() === "" ||
    (body.signalType !== "recommendation_issued" &&
      body.signalType !== "user_decision" &&
      body.signalType !== "execution_status" &&
      body.signalType !== "outcome_delta")
  ) {
    return NextResponse.json({ error: "INVALID_LEARNING_EVENT_PAYLOAD" }, { status: 400 });
  }

  const locationId = body.locationId as number;
  const analyticsId = body.analyticsId as number;
  const recommendationId = body.recommendationId.trim();
  const linkageKey = buildLearningLinkageKey({
    locationId,
    analyticsId,
    recommendationId,
  });

  const draftEvent: LearningSignalEvent = {
    id: "draft",
    schemaVersion: "v1",
    linkageKey,
    locationId,
    analyticsId,
    persona: body.persona,
    sourceAgentId: body.sourceAgentId.trim(),
    recommendationId,
    signalType: body.signalType,
    decisionState:
      body.decisionState === "accepted" || body.decisionState === "rejected"
        ? body.decisionState
        : null,
    executionState:
      body.executionState === "scheduled" ||
      body.executionState === "published" ||
      body.executionState === "failed"
        ? body.executionState
        : null,
    outcomeDeltaRevenue:
      typeof body.outcomeDeltaRevenue === "number" ? body.outcomeDeltaRevenue : null,
    outcomeDeltaQty: typeof body.outcomeDeltaQty === "number" ? body.outcomeDeltaQty : null,
    outcomeConfidence:
      body.outcomeConfidence === "high" ||
      body.outcomeConfidence === "medium" ||
      body.outcomeConfidence === "low" ||
      body.outcomeConfidence === "blocked"
        ? body.outcomeConfidence
        : null,
    sampleSize:
      typeof body.sampleSize === "number" && Number.isInteger(body.sampleSize)
        ? body.sampleSize
        : null,
    eligibleForLearning: false,
    eligibilityReasons: [],
    createdAt: new Date().toISOString(),
  };

  let eligibilityForEvent = { eligible: false, reasons: ["eligibility_not_evaluated"] };
  try {
    const evaluation = await evaluateEligibility([draftEvent]);
    const row = (evaluation.eligibility ?? [])[0];
    if (row) {
      eligibilityForEvent = { eligible: row.eligible, reasons: row.reasons };
    }
  } catch {
    eligibilityForEvent = { eligible: false, reasons: ["eligibility_service_unavailable"] };
  }

  const event = await appendLearningSignalEvent(prisma, {
    linkageKey,
    locationId,
    analyticsId,
    persona: body.persona,
    sourceAgentId: body.sourceAgentId.trim(),
    recommendationId,
    signalType: body.signalType,
    decisionState: draftEvent.decisionState,
    executionState: draftEvent.executionState,
    outcomeDeltaRevenue: draftEvent.outcomeDeltaRevenue,
    outcomeDeltaQty: draftEvent.outcomeDeltaQty,
    outcomeConfidence: draftEvent.outcomeConfidence,
    sampleSize: draftEvent.sampleSize,
    eligibleForLearning: eligibilityForEvent.eligible,
    eligibilityReasons: eligibilityForEvent.reasons,
  });

  return NextResponse.json({ event });
}
