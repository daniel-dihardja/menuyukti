import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { listLearningSignalEvents } from "@/lib/agents/learning-repository";
import {
  appendReleaseLoopRecord,
  listReleaseLoopRecords,
  type ReleaseLoopAuditRecord,
} from "@/lib/agents/release-loop-repository";
import {
  createDecisionApiContract,
  createDecisionContext,
} from "@/lib/contracts/decision-api-contract";

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

export async function GET(request: NextRequest) {
  const locationId = parsePositiveInt(request.nextUrl.searchParams.get("locationId"));
  const analyticsId = parsePositiveInt(request.nextUrl.searchParams.get("analyticsId"));
  if (!locationId) {
    const context = createDecisionContext({
      persona: "analyst",
      trust: { qualityStatus: "failed", reasons: ["invalid_location_id"] },
    });
    return NextResponse.json(
      {
        error: "INVALID_LOCATION_ID",
        contract: createDecisionApiContract({
          surface: "agent:learning-release-loop",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 400 },
    );
  }
  const records = await listReleaseLoopRecords(prisma, {
    locationId,
    analyticsId: analyticsId ?? undefined,
    limit: parsePositiveInt(request.nextUrl.searchParams.get("limit")) ?? 30,
  });
  const latest = records[0] ?? null;
  const latestNonAdvance = latest?.decision !== "advance";
  const context = createDecisionContext({
    persona: "analyst",
    locationId,
    analyticsId: analyticsId ?? null,
    trust: {
      qualityStatus: records.length === 0 || latestNonAdvance ? "warn" : "passed",
      reasons:
        records.length === 0
          ? ["no_release_records"]
          : latestNonAdvance
            ? [`latest_decision_${latest?.decision ?? "hold"}`]
            : [],
    },
  });

  return NextResponse.json({
    locationId,
    analyticsId: analyticsId ?? null,
    records,
    contract: createDecisionApiContract({
      surface: "agent:learning-release-loop",
      context,
      readiness: records.length === 0 || latestNonAdvance ? "degraded" : "ready",
      confidence: records.length === 0 || latestNonAdvance ? "medium" : "high",
      evidence: [
        {
          source: "derived_runtime",
          entity: "agent.release_loop",
          metric: "record_count",
          value: records.length,
          key: { locationId, analyticsId: analyticsId ?? null },
        },
      ],
    }),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    locationId?: number;
    analyticsId?: number;
    stage?: "shadow" | "canary" | "rollout";
    candidatePolicyVersion?: string;
    baselinePolicyVersion?: string;
    simulateCanaryFailure?: boolean;
  };
  if (
    !Number.isInteger(body.locationId) ||
    !Number.isInteger(body.analyticsId) ||
    (body.stage !== "shadow" && body.stage !== "canary" && body.stage !== "rollout") ||
    typeof body.candidatePolicyVersion !== "string" ||
    body.candidatePolicyVersion.trim() === "" ||
    typeof body.baselinePolicyVersion !== "string" ||
    body.baselinePolicyVersion.trim() === ""
  ) {
    const context = createDecisionContext({
      persona: "analyst",
      trust: { qualityStatus: "failed", reasons: ["invalid_release_loop_payload"] },
    });
    return NextResponse.json(
      {
        error: "INVALID_RELEASE_LOOP_PAYLOAD",
        contract: createDecisionApiContract({
          surface: "agent:learning-release-loop",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 400 },
    );
  }

  const locationId = body.locationId as number;
  const analyticsId = body.analyticsId as number;
  const stage = body.stage;
  const candidatePolicyVersion = body.candidatePolicyVersion.trim();
  const baselinePolicyVersion = body.baselinePolicyVersion.trim();
  const simulateCanaryFailure = body.simulateCanaryFailure === true;

  const eligibleEvents = await listLearningSignalEvents(prisma, {
    locationId,
    analyticsId,
    eligibleOnly: true,
    limit: 500,
  });
  const shadowQualityScore = Math.min(1, eligibleEvents.length / 20);
  const shadowContractPassRate = eligibleEvents.length > 0 ? 1 : 0.9;
  const canaryErrorRate = simulateCanaryFailure ? 0.2 : 0.01;
  const canaryRegressionRate = simulateCanaryFailure ? 0.18 : 0.02;

  const priorRecords = await listReleaseLoopRecords(prisma, { locationId, analyticsId, limit: 100 });
  const priorStagePass =
    stage !== "rollout"
      ? true
      : priorRecords.some(
          (record) =>
            record.stage === "canary" &&
            record.candidatePolicyVersion === candidatePolicyVersion &&
            record.decision === "advance",
        );

  const agentsApiUrl = (process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001").replace(/\/+$/g, "");
  const response = await fetch(`${agentsApiUrl}/agents/learning/release-loop/evaluate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contract_version: "v1",
      stage,
      candidate_policy_version: candidatePolicyVersion,
      baseline_policy_version: baselinePolicyVersion,
      prior_stage_pass: priorStagePass,
      metrics: {
        shadow_quality_score: shadowQualityScore,
        shadow_contract_pass_rate: shadowContractPassRate,
        canary_error_rate: canaryErrorRate,
        canary_regression_rate: canaryRegressionRate,
      },
    }),
  });
  if (!response.ok) {
    const context = createDecisionContext({
      persona: "analyst",
      locationId,
      analyticsId,
      trust: { qualityStatus: "failed", reasons: ["agents_service_unavailable"] },
    });
    return NextResponse.json(
      {
        error: "AGENTS_SERVICE_UNAVAILABLE",
        contract: createDecisionApiContract({
          surface: "agent:learning-release-loop",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 503 },
    );
  }
  const decisionPayload = (await response.json()) as {
    run?: {
      run_id?: string;
      model?: string;
      model_id?: string;
      prompt_version?: string;
      llm_provider?: string;
      llm_mode?: string;
      llm_status?: string;
    };
    llm?: Record<string, unknown>;
    release_decision?: {
      decision?: "advance" | "hold" | "rollback";
      reasons?: string[];
      rollback_to_policy_version?: string | null;
    };
  };

  const record: ReleaseLoopAuditRecord = {
    id: `roll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    stage,
    candidatePolicyVersion,
    baselinePolicyVersion,
    decision: decisionPayload.release_decision?.decision ?? "hold",
    reasons: decisionPayload.release_decision?.reasons ?? [],
    rollbackToPolicyVersion: decisionPayload.release_decision?.rollback_to_policy_version ?? null,
    metrics: {
      shadowQualityScore,
      shadowContractPassRate,
      canaryErrorRate,
      canaryRegressionRate,
    },
    createdAt: new Date().toISOString(),
  };
  await appendReleaseLoopRecord(prisma, {
    locationId,
    analyticsId,
    record,
  });

  const context = createDecisionContext({
    persona: "analyst",
    locationId,
    analyticsId,
    trust: {
      qualityStatus: record.decision === "advance" ? "passed" : "warn",
      reasons: record.reasons,
    },
  });

  const run = decisionPayload.run;
  const modelName =
    typeof run?.model_id === "string"
      ? run.model_id
      : typeof run?.model === "string"
        ? run.model
        : "learning-release-loop-v1";
  const runId = typeof run?.run_id === "string" ? run.run_id : record.id;

  const responseBody = {
    record,
    decision: decisionPayload.release_decision ?? null,
    run: decisionPayload.run ?? null,
    llm: decisionPayload.llm ?? null,
    contract: createDecisionApiContract({
      surface: "agent:learning-release-loop",
      context,
      readiness: record.decision === "advance" ? "ready" : "degraded",
      confidence: record.decision === "advance" ? "high" : "medium",
      evidence: [
        {
          source: "derived_runtime",
          entity: "agent.release_loop",
          metric: "decision",
          value: record.decision,
          key: { locationId, analyticsId, stage: record.stage },
        },
      ],
    }),
  };

  const outputJson = JSON.parse(JSON.stringify(responseBody)) as Prisma.InputJsonValue;
  await prisma.agentOutput.upsert({
    where: {
      agentId_locationId_analyticsId: {
        agentId: "learning-release-loop",
        locationId,
        analyticsId,
      },
    },
    create: {
      agentId: "learning-release-loop",
      locationId,
      analyticsId,
      outputs: outputJson,
      contractVersion: "v1",
      runId,
      modelName,
      runStatus: record.decision,
      outputEnvelopeJson: outputJson,
    },
    update: {
      outputs: outputJson,
      contractVersion: "v1",
      runId,
      modelName,
      runStatus: record.decision,
      outputEnvelopeJson: outputJson,
    },
  });

  return NextResponse.json(responseBody);
}
