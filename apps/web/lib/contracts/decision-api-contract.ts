export type ContractVersion = "v1";

export type ContractPersona = "marketer" | "analyst";

export type ContractReadiness = "ready" | "degraded" | "blocked";

export type ContractConfidence = "high" | "medium" | "low" | "blocked";

export type ContractEvidenceSource =
  | "warehouse"
  | "marts"
  | "public_snapshot"
  | "derived_runtime";

export type ContractTrustMeta = {
  qualityStatus: "passed" | "warn" | "failed" | "unknown";
  freshnessMinutes: number | null;
  isStale: boolean;
  reasons: string[];
};

export type ContractLineageMeta = {
  pipelineRunId: string | null;
  schemaVersion: string | null;
  sourceSystem: string | null;
  ingestedAtUtc: string | null;
};

export type DecisionContextDto = {
  contractVersion: ContractVersion;
  persona: ContractPersona;
  locationId: number | null;
  analyticsId: number | null;
  timeWindow: {
    from: string | null;
    to: string | null;
  };
  filterState: Record<string, unknown>;
  lineage: ContractLineageMeta;
  trust: ContractTrustMeta;
};

export type EvidenceRefDto = {
  source: ContractEvidenceSource;
  entity: string;
  metric: string;
  value: string | number | boolean | null;
  key: Record<string, unknown>;
  pipelineRunId?: string | null;
  note?: string | null;
};

export type DecisionApiContractDto = {
  contractVersion: ContractVersion;
  surface: string;
  generatedAtUtc: string;
  context: DecisionContextDto;
  readiness: ContractReadiness;
  confidence: ContractConfidence;
  evidence: EvidenceRefDto[];
};

export function createTrustMeta(input?: Partial<ContractTrustMeta>): ContractTrustMeta {
  const qualityStatus = input?.qualityStatus ?? "unknown";
  const freshnessMinutes =
    typeof input?.freshnessMinutes === "number" ? input.freshnessMinutes : null;
  const isStale = input?.isStale ?? false;
  const reasons = Array.isArray(input?.reasons) ? input.reasons : [];

  return {
    qualityStatus,
    freshnessMinutes,
    isStale,
    reasons,
  };
}

export function createLineageMeta(input?: Partial<ContractLineageMeta>): ContractLineageMeta {
  return {
    pipelineRunId: input?.pipelineRunId ?? null,
    schemaVersion: input?.schemaVersion ?? "v1",
    sourceSystem: input?.sourceSystem ?? null,
    ingestedAtUtc: input?.ingestedAtUtc ?? null,
  };
}

export function readinessFromTrust(trust: ContractTrustMeta): ContractReadiness {
  if (trust.qualityStatus === "failed") return "blocked";
  if (trust.qualityStatus === "warn" || trust.isStale) return "degraded";
  if (trust.qualityStatus === "passed") return "ready";
  return "degraded";
}

export function confidenceFromReadiness(readiness: ContractReadiness): ContractConfidence {
  if (readiness === "ready") return "high";
  if (readiness === "degraded") return "medium";
  return "blocked";
}

export function createDecisionContext(input: {
  persona: ContractPersona;
  locationId?: number | null;
  analyticsId?: number | null;
  from?: string | null;
  to?: string | null;
  filterState?: Record<string, unknown>;
  trust?: Partial<ContractTrustMeta>;
  lineage?: Partial<ContractLineageMeta>;
}): DecisionContextDto {
  const trust = createTrustMeta(input.trust);

  return {
    contractVersion: "v1",
    persona: input.persona,
    locationId: input.locationId ?? null,
    analyticsId: input.analyticsId ?? null,
    timeWindow: {
      from: input.from ?? null,
      to: input.to ?? null,
    },
    filterState: input.filterState ?? {},
    lineage: createLineageMeta(input.lineage),
    trust,
  };
}

export function createDecisionApiContract(input: {
  surface: string;
  context: DecisionContextDto;
  evidence?: EvidenceRefDto[];
  readiness?: ContractReadiness;
  confidence?: ContractConfidence;
}): DecisionApiContractDto {
  const readiness = input.readiness ?? readinessFromTrust(input.context.trust);
  const confidence = input.confidence ?? confidenceFromReadiness(readiness);

  return {
    contractVersion: "v1",
    surface: input.surface,
    generatedAtUtc: new Date().toISOString(),
    context: input.context,
    readiness,
    confidence,
    evidence: input.evidence ?? [],
  };
}

export function mapAgentReadinessToTrust(input: {
  level: "ready" | "warn" | "blocked";
  reasonCode: string;
  qualityStatus: string | null;
  freshnessMinutes: number | null;
}): ContractTrustMeta {
  const qualityLower = String(input.qualityStatus ?? "").toLowerCase();
  const qualityStatus: ContractTrustMeta["qualityStatus"] =
    qualityLower === "passed" || qualityLower === "warn" || qualityLower === "failed"
      ? qualityLower
      : input.level === "ready"
        ? "passed"
        : input.level === "blocked"
          ? "failed"
          : "warn";

  const reasons = input.reasonCode === "READY" ? [] : [input.reasonCode.toLowerCase()];

  return createTrustMeta({
    qualityStatus,
    freshnessMinutes: input.freshnessMinutes,
    isStale: input.reasonCode === "DATA_STALE",
    reasons,
  });
}

export function mapSchedulerGuardrailToTrust(input: {
  readiness: "ready" | "degraded" | "blocked";
  qualityStatus: string | null;
  freshnessMinutes: number | null;
  isStale: boolean;
  reasons: string[];
}): ContractTrustMeta {
  const qualityLower = String(input.qualityStatus ?? "").toLowerCase();
  const qualityStatus: ContractTrustMeta["qualityStatus"] =
    qualityLower === "passed" || qualityLower === "warn" || qualityLower === "failed"
      ? qualityLower
      : input.readiness === "ready"
        ? "passed"
        : input.readiness === "blocked"
          ? "failed"
          : "warn";

  return createTrustMeta({
    qualityStatus,
    freshnessMinutes: input.freshnessMinutes,
    isStale: input.isStale,
    reasons: input.reasons,
  });
}
