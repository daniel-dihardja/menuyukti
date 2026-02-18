import fs from "node:fs";
import path from "node:path";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await ensureE2eData({ testId: "agent-release-gate", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  // Prime required workflows.
  const primeUrls = [
    `${baseUrl}/api/agents/strategist?analyticsId=1`,
    `${baseUrl}/api/agents/profit-intelligence?analyticsId=1`,
    `${baseUrl}/api/agents/consensus?analyticsId=1&mode=conservative`,
    `${baseUrl}/api/agents/simulation?analyticsId=1&mode=conservative`,
  ];
  for (const url of primeUrls) {
    const response = await fetch(url);
    assert(response.ok, `prime workflow failed ${url} status=${response.status}`);
  }

  const response = await fetch(`${baseUrl}/api/agents/release-gate?analyticsId=1`);
  assert(response.ok, `release gate endpoint failed status=${response.status}`);
  const body = (await response.json()) as {
    result?: {
      pass?: boolean;
      checks?: Record<string, boolean>;
      summary?: { totalWorkflows?: number };
    };
    observations?: unknown[];
  };
  assert(body.result?.pass === true, "release gate must pass");
  assert((body.result?.summary?.totalWorkflows ?? 0) >= 4, "release gate workflow count mismatch");
  assert(Array.isArray(body.observations) && body.observations.length >= 4, "release gate observations missing");

  const artifactsDir = path.resolve(process.cwd(), "e2e-artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  const reportPath = path.join(artifactsDir, "agent-release-gate-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(body, null, 2)}\n`, "utf8");

  console.log(`[e2e] agent-release-gate: passed`);
  console.log(`[e2e] report: ${reportPath}`);
}

run().catch((error) => {
  console.error("[e2e] agent-release-gate: failed", error);
  process.exit(1);
});
