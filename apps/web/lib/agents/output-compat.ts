import crypto from "node:crypto";

export type AgentTokenUsage = {
  input: number;
  output: number;
  total: number;
};

export type AgentOutputEnvelope = {
  contractVersion: "v1";
  run: {
    status: "succeeded" | "failed" | "blocked";
    model: string | null;
    runId: string | null;
    inputHash: string | null;
    outputHash: string | null;
    tokenUsage: AgentTokenUsage | null;
  };
  outputs: unknown;
};

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toTokenUsageOrNull(value: unknown): AgentTokenUsage | null {
  if (!value || typeof value !== "object") return null;
  const token = value as Record<string, unknown>;
  const input = Number(token.input);
  const output = Number(token.output);
  const total = Number(token.total);
  if (!Number.isFinite(input) || !Number.isFinite(output) || !Number.isFinite(total)) return null;
  return {
    input,
    output,
    total,
  };
}

function sha256Json(value: unknown): string {
  const payload = JSON.stringify(value) ?? "null";
  return `sha256:${crypto.createHash("sha256").update(payload).digest("hex")}`;
}

export function buildEnvelopeFromResult(result: Record<string, unknown>): AgentOutputEnvelope {
  const outputs = result.outputs ?? null;
  const runId = toStringOrNull(result.run_id ?? result.runId);
  const model = toStringOrNull(result.model);
  const statusRaw = toStringOrNull(result.status)?.toLowerCase();
  const status: AgentOutputEnvelope["run"]["status"] =
    statusRaw === "failed" || statusRaw === "blocked" ? statusRaw : "succeeded";
  const inputHash = toStringOrNull(result.input_hash ?? result.inputHash);
  const outputHash = toStringOrNull(result.output_hash ?? result.outputHash) ?? sha256Json(outputs);
  const tokenUsage = toTokenUsageOrNull(result.token_usage ?? result.tokenUsage);

  return {
    contractVersion: "v1",
    run: {
      status,
      model,
      runId,
      inputHash,
      outputHash,
      tokenUsage,
    },
    outputs,
  };
}

export function normalizeStoredEnvelope(record: {
  outputs: unknown;
  outputEnvelopeJson?: unknown;
  contractVersion?: string | null;
  runId?: string | null;
  modelName?: string | null;
  runStatus?: string | null;
  inputHash?: string | null;
  outputHash?: string | null;
  tokenUsageJson?: unknown;
}): AgentOutputEnvelope {
  const fromEnvelope =
    record.outputEnvelopeJson &&
    typeof record.outputEnvelopeJson === "object" &&
    !Array.isArray(record.outputEnvelopeJson)
      ? (record.outputEnvelopeJson as Record<string, unknown>)
      : null;

  if (fromEnvelope && "outputs" in fromEnvelope) {
    const run =
      fromEnvelope.run && typeof fromEnvelope.run === "object" && !Array.isArray(fromEnvelope.run)
        ? (fromEnvelope.run as Record<string, unknown>)
        : {};
    const statusRaw = toStringOrNull(run.status)?.toLowerCase();
    const status: AgentOutputEnvelope["run"]["status"] =
      statusRaw === "failed" || statusRaw === "blocked" ? statusRaw : "succeeded";

    return {
      contractVersion:
        fromEnvelope.contractVersion === "v1" || record.contractVersion === "v1"
          ? "v1"
          : "v1",
      run: {
        status,
        model: toStringOrNull(run.model),
        runId: toStringOrNull(run.runId),
        inputHash: toStringOrNull(run.inputHash),
        outputHash: toStringOrNull(run.outputHash),
        tokenUsage: toTokenUsageOrNull(run.tokenUsage),
      },
      outputs: fromEnvelope.outputs,
    };
  }

  const statusRaw = toStringOrNull(record.runStatus)?.toLowerCase();
  const status: AgentOutputEnvelope["run"]["status"] =
    statusRaw === "failed" || statusRaw === "blocked" ? statusRaw : "succeeded";

  return {
    contractVersion: "v1",
    run: {
      status,
      model: toStringOrNull(record.modelName),
      runId: toStringOrNull(record.runId),
      inputHash: toStringOrNull(record.inputHash),
      outputHash: toStringOrNull(record.outputHash),
      tokenUsage: toTokenUsageOrNull(record.tokenUsageJson),
    },
    outputs: record.outputs,
  };
}

export function toLegacyOutputs(envelope: AgentOutputEnvelope): unknown {
  return envelope.outputs;
}
