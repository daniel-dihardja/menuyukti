import assert from "node:assert/strict";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

type AgentEnvelope = {
  run?: {
    run_id?: unknown;
    model?: unknown;
    model_id?: unknown;
    prompt_version?: unknown;
    llm_status?: unknown;
  };
  llm?: {
    status?: unknown;
    mode?: unknown;
    model_id?: unknown;
    prompt_version?: unknown;
  };
};

function assertLlmMetadata(label: string, body: AgentEnvelope) {
  assert(body.run, `${label}: missing run metadata`);
  assert.equal(typeof body.run?.run_id, "string", `${label}: missing run_id`);
  assert.equal(typeof body.run?.model, "string", `${label}: missing run.model`);
  assert.equal(typeof body.run?.model_id, "string", `${label}: missing run.model_id`);
  assert.equal(typeof body.run?.prompt_version, "string", `${label}: missing run.prompt_version`);
  assert(body.llm, `${label}: missing llm metadata`);
  assert.equal(typeof body.llm?.status, "string", `${label}: missing llm.status`);
  assert.equal(typeof body.llm?.mode, "string", `${label}: missing llm.mode`);
  assert.equal(body.llm?.model_id, body.run?.model_id, `${label}: model_id mismatch`);
  assert.equal(body.llm?.prompt_version, body.run?.prompt_version, `${label}: prompt_version mismatch`);
}

async function run() {
  await ensureE2eData({ testId: "agent-llm-runtime-availability", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const strategistResponse = await fetch(`${baseUrl}/api/agents/strategist?analyticsId=1`);
  assert(strategistResponse.ok, `strategist endpoint failed status=${strategistResponse.status}`);
  const strategistBody = (await strategistResponse.json()) as { strategist?: AgentEnvelope };
  assertLlmMetadata("strategist", strategistBody.strategist ?? {});

  const profitResponse = await fetch(`${baseUrl}/api/agents/profit-intelligence?analyticsId=1`);
  assert(profitResponse.ok, `profit-intelligence endpoint failed status=${profitResponse.status}`);
  const profitBody = (await profitResponse.json()) as { profitIntelligence?: AgentEnvelope };
  assertLlmMetadata("profit-intelligence", profitBody.profitIntelligence ?? {});

  const consensusResponse = await fetch(`${baseUrl}/api/agents/consensus?analyticsId=1&mode=conservative`);
  assert(consensusResponse.ok, `consensus endpoint failed status=${consensusResponse.status}`);
  const consensusBody = (await consensusResponse.json()) as { consensus?: AgentEnvelope };
  assertLlmMetadata("consensus", consensusBody.consensus ?? {});

  const simulationResponse = await fetch(`${baseUrl}/api/agents/simulation?analyticsId=1&mode=conservative`);
  assert(simulationResponse.ok, `simulation endpoint failed status=${simulationResponse.status}`);
  const simulationBody = (await simulationResponse.json()) as { simulation?: AgentEnvelope };
  assertLlmMetadata("simulation", simulationBody.simulation ?? {});

  const rerankResponse = await fetch(`${baseUrl}/api/agents/profit-intelligence/reranked?analyticsId=1`);
  assert(rerankResponse.ok, `reranker endpoint failed status=${rerankResponse.status}`);
  const rerankBody = (await rerankResponse.json()) as { reranked?: AgentEnvelope };
  assertLlmMetadata("reranker", rerankBody.reranked ?? {});

  const memorySeed = await fetch(`${baseUrl}/api/agents/memory`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      locationId: 1,
      analyticsId: 1,
      recommendationId: `rec-llm-availability-${Date.now()}`,
      sourceAgentId: "menu-profit-intelligence",
      state: "accepted",
    }),
  });
  assert(memorySeed.ok, `memory seed endpoint failed status=${memorySeed.status}`);

  const memoryResponse = await fetch(`${baseUrl}/api/agents/memory?locationId=1&limit=10`);
  assert(memoryResponse.ok, `memory endpoint failed status=${memoryResponse.status}`);
  const memoryBody = (await memoryResponse.json()) as { memoryContext?: AgentEnvelope };
  assertLlmMetadata("memory", memoryBody.memoryContext ?? {});

  console.log("[e2e] agent-llm-runtime-availability: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-llm-runtime-availability: failed", error);
  process.exit(1);
});
