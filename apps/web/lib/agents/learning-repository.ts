import { PrismaClient } from "@prisma/client";

export type LearningSignalType =
  | "recommendation_issued"
  | "user_decision"
  | "execution_status"
  | "outcome_delta";

export type LearningSignalEvent = {
  id: string;
  schemaVersion: "v1";
  linkageKey: string;
  locationId: number;
  analyticsId: number;
  persona: "marketer" | "analyst";
  sourceAgentId: string;
  recommendationId: string;
  signalType: LearningSignalType;
  decisionState: "accepted" | "rejected" | null;
  executionState: "scheduled" | "published" | "failed" | null;
  outcomeDeltaRevenue: number | null;
  outcomeDeltaQty: number | null;
  outcomeConfidence: "high" | "medium" | "low" | "blocked" | null;
  sampleSize: number | null;
  eligibleForLearning: boolean;
  eligibilityReasons: string[];
  createdAt: string;
};

type StoredLearningPayload = {
  contractVersion: "v1";
  schemaVersion: "v1";
  locationId: number;
  analyticsId: number;
  events: LearningSignalEvent[];
};

const LEARNING_AGENT_ID = "learning-event-store";

function toInputJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function parseStoredPayload(value: unknown): StoredLearningPayload {
  const obj =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const rawEvents = Array.isArray(obj.events) ? obj.events : [];
  const events: LearningSignalEvent[] = rawEvents
    .map((raw) => {
      const row =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : {};
      if (
        typeof row.id !== "string" ||
        typeof row.linkageKey !== "string" ||
        typeof row.recommendationId !== "string" ||
        typeof row.sourceAgentId !== "string" ||
        typeof row.signalType !== "string" ||
        typeof row.createdAt !== "string"
      ) {
        return null;
      }
      return {
        id: row.id,
        schemaVersion: "v1",
        linkageKey: row.linkageKey,
        locationId: Number(row.locationId) || 0,
        analyticsId: Number(row.analyticsId) || 0,
        persona: row.persona === "marketer" ? "marketer" : "analyst",
        sourceAgentId: row.sourceAgentId,
        recommendationId: row.recommendationId,
        signalType: row.signalType as LearningSignalType,
        decisionState:
          row.decisionState === "accepted" || row.decisionState === "rejected"
            ? row.decisionState
            : null,
        executionState:
          row.executionState === "scheduled" ||
          row.executionState === "published" ||
          row.executionState === "failed"
            ? row.executionState
            : null,
        outcomeDeltaRevenue:
          typeof row.outcomeDeltaRevenue === "number"
            ? row.outcomeDeltaRevenue
            : null,
        outcomeDeltaQty:
          typeof row.outcomeDeltaQty === "number" ? row.outcomeDeltaQty : null,
        outcomeConfidence:
          row.outcomeConfidence === "high" ||
          row.outcomeConfidence === "medium" ||
          row.outcomeConfidence === "low" ||
          row.outcomeConfidence === "blocked"
            ? row.outcomeConfidence
            : null,
        sampleSize:
          typeof row.sampleSize === "number" && Number.isInteger(row.sampleSize)
            ? row.sampleSize
            : null,
        eligibleForLearning: row.eligibleForLearning === true,
        eligibilityReasons: Array.isArray(row.eligibilityReasons)
          ? row.eligibilityReasons.filter((item): item is string => typeof item === "string")
          : [],
        createdAt: row.createdAt,
      } satisfies LearningSignalEvent;
    })
    .filter((event): event is LearningSignalEvent => event !== null);

  return {
    contractVersion: "v1",
    schemaVersion: "v1",
    locationId: Number(obj.locationId) || 0,
    analyticsId: Number(obj.analyticsId) || 0,
    events,
  };
}

export function buildLearningLinkageKey(input: {
  locationId: number;
  analyticsId: number;
  recommendationId: string;
}): string {
  return `loc:${input.locationId}:an:${input.analyticsId}:rec:${input.recommendationId.trim()}`;
}

export async function appendLearningSignalEvent(
  prisma: PrismaClient,
  input: Omit<LearningSignalEvent, "id" | "schemaVersion" | "createdAt">,
): Promise<LearningSignalEvent> {
  const existing = await prisma.agentOutput.findUnique({
    where: {
      agentId_locationId_analyticsId: {
        agentId: LEARNING_AGENT_ID,
        locationId: input.locationId,
        analyticsId: input.analyticsId,
      },
    },
    select: { outputs: true },
  });
  const parsed = parseStoredPayload(existing?.outputs);

  const event: LearningSignalEvent = {
    id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    schemaVersion: "v1",
    createdAt: new Date().toISOString(),
    ...input,
  };
  const updated: StoredLearningPayload = {
    contractVersion: "v1",
    schemaVersion: "v1",
    locationId: input.locationId,
    analyticsId: input.analyticsId,
    events: [...parsed.events, event],
  };

  await prisma.agentOutput.upsert({
    where: {
      agentId_locationId_analyticsId: {
        agentId: LEARNING_AGENT_ID,
        locationId: input.locationId,
        analyticsId: input.analyticsId,
      },
    },
    create: {
      agentId: LEARNING_AGENT_ID,
      locationId: input.locationId,
      analyticsId: input.analyticsId,
      outputs: toInputJson(updated),
      contractVersion: "v1",
      runStatus: "accepted",
      outputEnvelopeJson: toInputJson(updated),
    },
    update: {
      outputs: toInputJson(updated),
      contractVersion: "v1",
      runStatus: "accepted",
      outputEnvelopeJson: toInputJson(updated),
    },
  });

  return event;
}

export async function listLearningSignalEvents(
  prisma: PrismaClient,
  params: {
    locationId: number;
    analyticsId?: number;
    eligibleOnly?: boolean;
    limit?: number;
  },
): Promise<LearningSignalEvent[]> {
  const rows = await prisma.agentOutput.findMany({
    where: {
      agentId: LEARNING_AGENT_ID,
      locationId: params.locationId,
      ...(params.analyticsId ? { analyticsId: params.analyticsId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { outputs: true },
  });

  const limit = Math.max(1, Math.min(500, params.limit ?? 50));
  const events = rows
    .flatMap((row) => parseStoredPayload(row.outputs).events)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .filter((event) => (params.eligibleOnly ? event.eligibleForLearning : true));

  return events.slice(0, limit);
}
