import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function seedEligibleLearningEvents() {
  for (let i = 0; i < 12; i += 1) {
    const response = await fetch(`${baseUrl}/api/agents/learning/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        locationId: 1,
        analyticsId: 1,
        persona: "analyst",
        sourceAgentId: "learning-release-loop",
        recommendationId: `trust-seed-${Date.now()}-${i}`,
        signalType: "outcome_delta",
        outcomeDeltaRevenue: 120,
        outcomeDeltaQty: 4,
        outcomeConfidence: "high",
        sampleSize: 10,
      }),
    });
    assert(response.ok, `failed to seed learning event status=${response.status}`);
  }
}

async function run() {
  await ensureE2eData({ testId: "agent-output-trust-panel", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/agents/learning-release-loop`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Run Sample Context/i }).click();
  await page.locator("[data-agent-output-trust-panel]").first().waitFor({ state: "visible", timeout: 30_000 });
  await seedEligibleLearningEvents();
  const degradedSeed = await fetch(`${baseUrl}/api/agents/learning/release-loop`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      locationId: 1,
      analyticsId: 1,
      stage: "canary",
      candidatePolicyVersion: "as10-v2",
      baselinePolicyVersion: "as10-v1",
      simulateCanaryFailure: true,
    }),
  });
  assert(degradedSeed.ok, `failed to seed degraded release-loop state status=${degradedSeed.status}`);
  const degradedBody = (await degradedSeed.json()) as {
    contract?: { readiness?: string };
  };
  assert(
    degradedBody.contract?.readiness === "degraded",
    `expected degraded contract readiness from api seed, got=${degradedBody.contract?.readiness ?? "missing"}`,
  );
  await page.getByRole("button", { name: /Refresh Audit/i }).click();
  await page.locator("[data-agent-output-trust-panel]").first().waitFor({ state: "visible", timeout: 30_000 });
  const degradedText = await page.locator("[data-trust-readiness]").first().innerText();
  assert(/ready|degraded/i.test(degradedText), `expected trust readiness badge, got=${degradedText}`);

  await page.goto(`${baseUrl}/agents/agent-memory-tracker`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Run Sample Context/i }).click();
  await page.locator("[data-agent-output-trust-panel]").first().waitFor({ state: "visible", timeout: 30_000 });
  const readyText = await page.locator("[data-trust-readiness]").first().innerText();
  assert(/ready/i.test(readyText), `expected ready trust readiness, got=${readyText}`);

  await browser.close();
  console.log("[e2e] agent-output-trust-panel: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-output-trust-panel: failed", error);
  process.exit(1);
});
