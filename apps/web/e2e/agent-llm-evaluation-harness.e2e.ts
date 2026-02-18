import assert from "node:assert/strict";
import { ensureApiReachable } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

async function run() {
  await ensureApiReachable(baseUrl);

  const response = await fetch(`${baseUrl}/api/agents/evaluation/harness?mode=mock`);
  assert.equal(response.status, 200, "evaluation harness endpoint should return 200");
  const body = (await response.json()) as {
    harness_version?: string;
    summary?: { total?: number; passed?: number; failed?: number; release_gate_passed?: boolean };
    results?: Array<{ agent_id?: string; prompt_version?: string | null; model_id?: string | null }>;
  };

  assert.equal(body.harness_version, "ast12-v1", "unexpected harness version");
  assert.ok((body.summary?.total ?? 0) >= 7, "expected all phase-1 agents in evaluation summary");
  assert.ok((body.summary?.passed ?? 0) >= 1, "expected at least one passing evaluation result");
  assert.ok(Array.isArray(body.results), "expected results array");
  const strategist = body.results?.find((item) => item.agent_id === "marketer-strategist");
  assert.ok(strategist, "strategist evaluation result missing");
  assert.ok(typeof strategist?.prompt_version === "string", "prompt version should be surfaced");
  assert.ok(typeof strategist?.model_id === "string", "model id should be surfaced");

  console.log("[e2e] agent-llm-evaluation-harness: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-llm-evaluation-harness: failed", error);
  process.exit(1);
});
