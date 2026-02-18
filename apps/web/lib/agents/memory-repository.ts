import { PrismaClient } from "@prisma/client";

type MemoryState = "accepted" | "rejected";

export type RecommendationMemoryEvent = {
  id: string;
  version: number;
  recommendationId: string;
  sourceAgentId: string;
  state: MemoryState;
  rationale: string | null;
  executionLink: string | null;
  outcomeLabel: string | null;
  outcomeScore: number | null;
  createdAt: string;
};

type StoredMemoryPayload = {
  contractVersion: "v1";
  locationId: number;
  analyticsId: number;
  events: RecommendationMemoryEvent[];
};

const MEMORY_AGENT_ID = "agent-memory-store";

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseStoredPayload(value: unknown): StoredMemoryPayload {
  const obj = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const eventsRaw = Array.isArray(obj.events) ? obj.events : [];
  const events: RecommendationMemoryEvent[] = eventsRaw
    .map((item) => {
      const row = item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {};
      const state = row.state === "accepted" || row.state === "rejected" ? row.state : null;
      const version = Number(row.version);
      if (!state || !Number.isInteger(version) || version <= 0) return null;
      const id = toStringOrNull(row.id);
      const recommendationId = toStringOrNull(row.recommendationId);
      const sourceAgentId = toStringOrNull(row.sourceAgentId);
      const createdAt = toStringOrNull(row.createdAt);
      if (!id || !recommendationId || !sourceAgentId || !createdAt) return null;

      return {
        id,
        version,
        recommendationId,
        sourceAgentId,
        state,
        rationale: toStringOrNull(row.rationale),
        executionLink: toStringOrNull(row.executionLink),
        outcomeLabel: toStringOrNull(row.outcomeLabel),
        outcomeScore: toNumberOrNull(row.outcomeScore),
        createdAt,
      } satisfies RecommendationMemoryEvent;
    })
    .filter((row): row is RecommendationMemoryEvent => row !== null);

  return {
    contractVersion: "v1",
    locationId: Number(obj.locationId) || 0,
    analyticsId: Number(obj.analyticsId) || 0,
    events,
  };
}

function toInputJson(payload: StoredMemoryPayload) {
  return JSON.parse(JSON.stringify(payload));
}

export async function appendRecommendationMemory(
  prisma: PrismaClient,
  input: {
    locationId: number;
    analyticsId: number;
    recommendationId: string;
    sourceAgentId: string;
    state: MemoryState;
    rationale?: string | null;
    executionLink?: string | null;
    outcomeLabel?: string | null;
    outcomeScore?: number | null;
  },
): Promise<RecommendationMemoryEvent> {
  const now = new Date().toISOString();
  const existing = await prisma.agentOutput.findUnique({
    where: {
      agentId_locationId_analyticsId: {
        agentId: MEMORY_AGENT_ID,
        locationId: input.locationId,
        analyticsId: input.analyticsId,
      },
    },
    select: { outputs: true },
  });

  const parsed = parseStoredPayload(existing?.outputs);
  const latestVersion = parsed.events.reduce((max, event) => Math.max(max, event.version), 0);
  const event: RecommendationMemoryEvent = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    version: latestVersion + 1,
    recommendationId: input.recommendationId,
    sourceAgentId: input.sourceAgentId,
    state: input.state,
    rationale: input.rationale ?? null,
    executionLink: input.executionLink ?? null,
    outcomeLabel: input.outcomeLabel ?? null,
    outcomeScore:
      typeof input.outcomeScore === "number" && Number.isFinite(input.outcomeScore)
        ? input.outcomeScore
        : null,
    createdAt: now,
  };

  const updated: StoredMemoryPayload = {
    contractVersion: "v1",
    locationId: input.locationId,
    analyticsId: input.analyticsId,
    events: [...parsed.events, event],
  };

  await prisma.agentOutput.upsert({
    where: {
      agentId_locationId_analyticsId: {
        agentId: MEMORY_AGENT_ID,
        locationId: input.locationId,
        analyticsId: input.analyticsId,
      },
    },
    create: {
      agentId: MEMORY_AGENT_ID,
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

export async function listRecentRecommendationMemory(
  prisma: PrismaClient,
  params: { locationId: number; limit?: number },
): Promise<RecommendationMemoryEvent[]> {
  const limit = Math.max(1, Math.min(200, params.limit ?? 20));
  const rows = await prisma.agentOutput.findMany({
    where: {
      agentId: MEMORY_AGENT_ID,
      locationId: params.locationId,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { outputs: true },
  });

  const allEvents = rows
    .flatMap((row) => parseStoredPayload(row.outputs).events)
    .sort((a, b) => b.version - a.version);
  return allEvents.slice(0, limit);
}
