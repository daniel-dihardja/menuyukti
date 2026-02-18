import fs from "node:fs";
import path from "node:path";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const ENV_PATH = path.resolve(process.cwd(), ".env");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/g);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function assertContractShape(payload: Record<string, unknown>, surface: string) {
  const contract = payload.contract as Record<string, unknown> | undefined;
  assert(contract && typeof contract === "object", `contract missing for ${surface}`);
  assert(contract.contractVersion === "v1", `contractVersion mismatch for ${surface}`);
  assert(contract.surface === surface, `surface mismatch for ${surface}`);
  assert(typeof contract.generatedAtUtc === "string", `generatedAtUtc missing for ${surface}`);
  assert(typeof contract.context === "object", `context missing for ${surface}`);
  assert(Array.isArray(contract.evidence), `evidence missing for ${surface}`);
  const readiness = contract.readiness;
  const confidence = contract.confidence;
  assert(
    readiness === "ready" || readiness === "degraded" || readiness === "blocked",
    `invalid readiness for ${surface}`,
  );
  assert(
    confidence === "high" || confidence === "medium" || confidence === "low" || confidence === "blocked",
    `invalid confidence for ${surface}`,
  );
}

async function fetchJson(
  input: string,
  init?: RequestInit,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(input, init);
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, body };
}

async function run() {
  loadEnvFile(ENV_PATH);
  if (process.env.E2E_REFRESH_DB === "1" && process.env.E2E_DATA_POLICY === undefined) {
    process.env.E2E_DATA_POLICY = "reset-seed";
  }
  await ensureE2eData({ testId: "api-contracts", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const { prisma } = await import("../lib/prisma/client");
  const analytics = await prisma.analytics.findFirst({
    orderBy: { id: "asc" },
    select: { id: true, locationId: true },
  });
  assert(analytics, "[api-contracts-e2e] analytics row not found. Seed DB first.");

  try {
    const matrix = await fetchJson(`${baseUrl}/api/analytics/${analytics.id}/matrix-metadata`);
    assert(matrix.status === 200, `matrix metadata failed status=${matrix.status}`);
    assertContractShape(matrix.body, "matrix");

    const heatmap = await fetchJson(
      `${baseUrl}/api/marts/daypart-performance?locationId=${analytics.locationId}`,
    );
    assert(heatmap.status === 200, `daypart performance failed status=${heatmap.status}`);
    assertContractShape(heatmap.body, "heatmap");

    const pairs = await fetchJson(`${baseUrl}/api/marts/pair-metrics?locationId=${analytics.locationId}`);
    assert(pairs.status === 200, `pair metrics failed status=${pairs.status}`);
    assertContractShape(pairs.body, "pairs");

    const scheduler = await fetchJson(
      `${baseUrl}/api/instagram/schedules?locationId=${analytics.locationId}`,
    );
    assert(
      scheduler.status === 200 || scheduler.status === 503,
      `scheduler failed status=${scheduler.status}`,
    );
    if (scheduler.status === 200) {
      assertContractShape(scheduler.body, "scheduler");
      assert(typeof scheduler.body.guardrail === "object", "scheduler guardrail missing");
    } else {
      assertContractShape(scheduler.body, "scheduler");
      assert(
        scheduler.body.error === "SCHEDULER_STORAGE_NOT_READY",
        "scheduler storage readiness error expected",
      );
    }

    const audienceRemoved = await fetchJson(`${baseUrl}/api/agents/audience?analyticsId=${analytics.id}`);
    assert(audienceRemoved.status === 404, `audience legacy route expected 404, got ${audienceRemoved.status}`);

    const toneRemoved = await fetchJson(`${baseUrl}/api/agents/tone?analyticsId=${analytics.id}`);
    assert(toneRemoved.status === 404, `tone legacy route expected 404, got ${toneRemoved.status}`);
  } finally {
    await prisma.$disconnect();
  }

  console.log("[api-contracts-e2e] passed");
}

run().catch((error) => {
  console.error("[api-contracts-e2e] failed:", error);
  process.exit(1);
});
