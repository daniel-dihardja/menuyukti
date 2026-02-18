import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

const disallowedRoutes = [
  "/agents/orchestrator",
  "/agents/orchestration",
  "/agents/collaboration",
  "/agents/multi-agent-workflow",
  "/api/agents/orchestrator",
  "/api/agents/orchestration",
  "/api/agents/collaboration",
  "/api/agents/multi-agent-workflow",
];

function loadAgentIds(): string[] {
  const raw = fs.readFileSync(path.resolve(process.cwd(), "lib/agents.json"), "utf8");
  const parsed = JSON.parse(raw) as Array<{ id?: string }>;
  return parsed.map((item) => item.id).filter((value): value is string => typeof value === "string");
}

async function run() {
  await ensureE2eData({ testId: "agent-phase2-handoff-readiness", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const ids = loadAgentIds();
  const forbiddenAgentIds = ["multi-agent-orchestrator", "campaign-copilot-orchestrator", "agent-graph-runtime"];
  for (const id of forbiddenAgentIds) {
    assert(!ids.includes(id), `Phase-2 agent id must not exist yet: ${id}`);
  }

  for (const route of disallowedRoutes) {
    const response = await fetch(`${baseUrl}${route}`);
    assert(response.status === 404, `Expected 404 for disallowed phase-2 route ${route}, got ${response.status}`);
  }

  console.log("[e2e] agent-phase2-handoff-readiness: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-phase2-handoff-readiness: failed", error);
  process.exit(1);
});
