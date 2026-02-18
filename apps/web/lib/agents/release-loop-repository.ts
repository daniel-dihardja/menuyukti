import { PrismaClient } from "@prisma/client";

export type ReleaseLoopAuditRecord = {
  id: string;
  stage: "shadow" | "canary" | "rollout";
  candidatePolicyVersion: string;
  baselinePolicyVersion: string;
  decision: "advance" | "hold" | "rollback";
  reasons: string[];
  rollbackToPolicyVersion: string | null;
  metrics: {
    shadowQualityScore: number;
    shadowContractPassRate: number;
    canaryErrorRate: number;
    canaryRegressionRate: number;
  };
  createdAt: string;
};

type StoredReleaseLoopPayload = {
  contractVersion: "v1";
  locationId: number;
  analyticsId: number;
  records: ReleaseLoopAuditRecord[];
};

const RELEASE_LOOP_AGENT_ID = "learning-release-loop-store";

function toInputJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function parsePayload(value: unknown): StoredReleaseLoopPayload {
  const obj =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const records = Array.isArray(obj.records)
    ? obj.records.filter((row): row is ReleaseLoopAuditRecord => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return false;
        const r = row as Record<string, unknown>;
        return (
          typeof r.id === "string" &&
          (r.stage === "shadow" || r.stage === "canary" || r.stage === "rollout") &&
          typeof r.candidatePolicyVersion === "string" &&
          typeof r.baselinePolicyVersion === "string" &&
          (r.decision === "advance" || r.decision === "hold" || r.decision === "rollback") &&
          typeof r.createdAt === "string"
        );
      })
    : [];
  return {
    contractVersion: "v1",
    locationId: Number(obj.locationId) || 0,
    analyticsId: Number(obj.analyticsId) || 0,
    records,
  };
}

export async function appendReleaseLoopRecord(
  prisma: PrismaClient,
  params: {
    locationId: number;
    analyticsId: number;
    record: ReleaseLoopAuditRecord;
  },
): Promise<void> {
  const existing = await prisma.agentOutput.findUnique({
    where: {
      agentId_locationId_analyticsId: {
        agentId: RELEASE_LOOP_AGENT_ID,
        locationId: params.locationId,
        analyticsId: params.analyticsId,
      },
    },
    select: { outputs: true },
  });
  const parsed = parsePayload(existing?.outputs);
  const updated: StoredReleaseLoopPayload = {
    contractVersion: "v1",
    locationId: params.locationId,
    analyticsId: params.analyticsId,
    records: [...parsed.records, params.record],
  };

  await prisma.agentOutput.upsert({
    where: {
      agentId_locationId_analyticsId: {
        agentId: RELEASE_LOOP_AGENT_ID,
        locationId: params.locationId,
        analyticsId: params.analyticsId,
      },
    },
    create: {
      agentId: RELEASE_LOOP_AGENT_ID,
      locationId: params.locationId,
      analyticsId: params.analyticsId,
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
}

export async function listReleaseLoopRecords(
  prisma: PrismaClient,
  params: { locationId: number; analyticsId?: number; limit?: number },
): Promise<ReleaseLoopAuditRecord[]> {
  const rows = await prisma.agentOutput.findMany({
    where: {
      agentId: RELEASE_LOOP_AGENT_ID,
      locationId: params.locationId,
      ...(params.analyticsId ? { analyticsId: params.analyticsId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: { outputs: true },
  });
  const limit = Math.max(1, Math.min(params.limit ?? 30, 200));
  return rows
    .flatMap((row) => parsePayload(row.outputs).records)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}
