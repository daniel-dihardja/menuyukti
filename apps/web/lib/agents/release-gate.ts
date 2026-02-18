export type ReleaseGateObservation = {
  workflowId: "strategist" | "profit_intelligence" | "consensus" | "simulation";
  readiness: "ready" | "degraded" | "blocked";
  confidence: "high" | "medium" | "low" | "blocked";
  evidenceCount: number;
  contractValid: boolean;
  statusCode: number;
  reason?: string;
};

export type ReleaseGateThresholds = {
  minWorkflows: number;
  maxBlocked: number;
  minAverageEvidence: number;
};

export type ReleaseGateResult = {
  pass: boolean;
  checks: {
    workflowsPresent: boolean;
    contractsValid: boolean;
    blockedWithinLimit: boolean;
    evidenceWithinLimit: boolean;
  };
  summary: {
    totalWorkflows: number;
    blockedWorkflows: number;
    averageEvidence: number;
  };
};

export const DEFAULT_RELEASE_GATE_THRESHOLDS: ReleaseGateThresholds = {
  minWorkflows: 4,
  maxBlocked: 0,
  minAverageEvidence: 2,
};

export function evaluateAgentReleaseGate(
  observations: ReleaseGateObservation[],
  thresholds: ReleaseGateThresholds = DEFAULT_RELEASE_GATE_THRESHOLDS,
): ReleaseGateResult {
  const totalWorkflows = observations.length;
  const blockedWorkflows = observations.filter((item) => item.readiness === "blocked").length;
  const contractsValid = observations.every((item) => item.contractValid);
  const averageEvidence =
    observations.length === 0
      ? 0
      : observations.reduce((sum, item) => sum + item.evidenceCount, 0) / observations.length;

  const checks = {
    workflowsPresent: totalWorkflows >= thresholds.minWorkflows,
    contractsValid,
    blockedWithinLimit: blockedWorkflows <= thresholds.maxBlocked,
    evidenceWithinLimit: averageEvidence >= thresholds.minAverageEvidence,
  };

  return {
    pass: checks.workflowsPresent && checks.contractsValid && checks.blockedWithinLimit && checks.evidenceWithinLimit,
    checks,
    summary: {
      totalWorkflows,
      blockedWorkflows,
      averageEvidence: Number(averageEvidence.toFixed(2)),
    },
  };
}
