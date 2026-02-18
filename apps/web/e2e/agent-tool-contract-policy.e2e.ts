import { ensureE2eData } from "./_helpers/data-setup";

const agentsApiUrl = process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  await ensureE2eData({
    testId: "agent-tool-contract-policy",
    defaultPolicy: "reuse",
    runSmokeCheck: false,
  });

  const docsResponse = await fetch(`${agentsApiUrl.replace(/\/+$/g, "")}/docs`);
  assert(docsResponse.ok, `agents docs endpoint unavailable: ${docsResponse.status}`);

  const allowResponse = await fetch(`${agentsApiUrl.replace(/\/+$/g, "")}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contract_version: "v1",
      tool_id: "decision_context.read",
      persona: "marketer",
      workflow_stage: "planning",
      scope: { location_id: 1, analytics_id: 1 },
      payload: {},
    }),
  });
  assert(allowResponse.status === 200, `allow case failed: ${allowResponse.status}`);
  const allowBody = (await allowResponse.json()) as { status?: string; reason_code?: string };
  assert(allowBody.status === "accepted", "allow case should be accepted");
  assert(allowBody.reason_code === "ALLOWED", "allow case reason code mismatch");

  const blockResponse = await fetch(`${agentsApiUrl.replace(/\/+$/g, "")}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contract_version: "v1",
      tool_id: "scheduler.handoff",
      persona: "analyst",
      workflow_stage: "analysis",
      scope: { location_id: 1, analytics_id: 1 },
      payload: { recommendations: ["item-a"] },
    }),
  });
  assert(blockResponse.status === 403, `block case failed: ${blockResponse.status}`);
  const blockBody = (await blockResponse.json()) as { status?: string; reason_code?: string };
  assert(blockBody.status === "blocked", "block case should be blocked");
  assert(
    blockBody.reason_code === "TOOL_NOT_ALLOWED_FOR_PERSONA_STAGE",
    "block case reason code mismatch",
  );

  const invalidResponse = await fetch(`${agentsApiUrl.replace(/\/+$/g, "")}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contract_version: "v1",
      tool_id: "scheduler.handoff",
      persona: "marketer",
      workflow_stage: "planning",
      scope: { location_id: 1, analytics_id: 1 },
      payload: {},
    }),
  });
  assert(invalidResponse.status === 400, `invalid case failed: ${invalidResponse.status}`);
  const invalidBody = (await invalidResponse.json()) as { status?: string; reason_code?: string };
  assert(invalidBody.status === "invalid", "invalid case should be invalid");
  assert(
    invalidBody.reason_code === "TOOL_CONTRACT_VALIDATION_FAILED_RECOMMENDATIONS_REQUIRED",
    "invalid case reason code mismatch",
  );

  console.log("[e2e] agent-tool-contract-policy: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-tool-contract-policy: failed", error);
  process.exit(1);
});
