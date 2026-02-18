import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function postEligibleOutcome(index: number) {
  const recommendationId = `rec-release-loop-${Date.now()}-${index}`;
  const response = await fetch(`${baseUrl}/api/agents/learning/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      locationId: 1,
      analyticsId: 1,
      persona: "analyst",
      sourceAgentId: "menu-profit-intelligence",
      recommendationId,
      signalType: "outcome_delta",
      outcomeDeltaRevenue: 120 + index,
      outcomeDeltaQty: 10 + index,
      outcomeConfidence: "high",
      sampleSize: 15,
    }),
  });
  assert(response.ok, `learning event ${index} failed status=${response.status}`);
}

async function postReleaseDecision(payload: {
  stage: "shadow" | "canary" | "rollout";
  candidatePolicyVersion: string;
  baselinePolicyVersion: string;
  simulateCanaryFailure?: boolean;
}) {
  const response = await fetch(`${baseUrl}/api/agents/learning/release-loop`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      locationId: 1,
      analyticsId: 1,
      ...payload,
    }),
  });
  const body = (await response.json()) as {
    record?: {
      decision?: "advance" | "hold" | "rollback";
      reasons?: string[];
      rollbackToPolicyVersion?: string | null;
    };
    error?: string;
  };
  return { response, body };
}

async function run() {
  await ensureE2eData({ testId: "agent-learning-release-loop", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  for (let i = 0; i < 12; i += 1) {
    await postEligibleOutcome(i);
  }

  const shadow = await postReleaseDecision({
    stage: "shadow",
    candidatePolicyVersion: "as11-v2",
    baselinePolicyVersion: "as10-v1",
  });
  assert(shadow.response.ok, `shadow release failed status=${shadow.response.status}`);
  assert(shadow.body.record?.decision === "advance", "shadow stage should advance");

  const canary = await postReleaseDecision({
    stage: "canary",
    candidatePolicyVersion: "as11-v2",
    baselinePolicyVersion: "as10-v1",
  });
  assert(canary.response.ok, `canary release failed status=${canary.response.status}`);
  assert(canary.body.record?.decision === "advance", "canary stage should advance");

  const rolloutWithoutCanary = await postReleaseDecision({
    stage: "rollout",
    candidatePolicyVersion: "as11-v9",
    baselinePolicyVersion: "as10-v1",
  });
  assert(
    rolloutWithoutCanary.response.ok,
    `rollout-no-canary failed status=${rolloutWithoutCanary.response.status}`,
  );
  assert(
    rolloutWithoutCanary.body.record?.decision === "hold",
    "rollout should hold when prior canary pass is missing",
  );

  const rollback = await postReleaseDecision({
    stage: "canary",
    candidatePolicyVersion: "as11-v4",
    baselinePolicyVersion: "as10-v1",
    simulateCanaryFailure: true,
  });
  assert(rollback.response.ok, `rollback canary failed status=${rollback.response.status}`);
  assert(rollback.body.record?.decision === "rollback", "canary failure should rollback");
  assert(
    rollback.body.record?.rollbackToPolicyVersion === "as10-v1",
    "rollback target should be baseline policy",
  );
  assert(
    (rollback.body.record?.reasons ?? []).some((reason) => reason.includes("canary")),
    "rollback reasons should include canary threshold failure",
  );

  const auditResponse = await fetch(
    `${baseUrl}/api/agents/learning/release-loop?locationId=1&analyticsId=1&limit=20`,
  );
  assert(auditResponse.ok, `release-loop audit fetch failed status=${auditResponse.status}`);
  const auditBody = (await auditResponse.json()) as {
    records?: Array<{ decision?: string; stage?: string; candidatePolicyVersion?: string }>;
  };
  const records = auditBody.records ?? [];
  assert(records.length >= 4, "release-loop audit must contain recorded decisions");
  assert(
    records.some((record) => record.decision === "rollback" && record.stage === "canary"),
    "release-loop audit missing rollback canary decision",
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/agents`, { waitUntil: "domcontentloaded" });
  await page.getByText(/learning release loop/i).first().waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('a[href="/agents/learning-release-loop"]').first().click();
  await page.locator("#agent-location-select").click();
  await page.locator('[role="option"]').first().click();
  await page.locator("#agent-analytics-select").click();
  await page.locator('[role="option"]').first().click();
  await page.getByRole("button", { name: /run release decision/i }).click();
  await page.getByText(/latest:/i).first().waitFor({ state: "visible", timeout: 30_000 });
  await browser.close();

  console.log("[e2e] agent-learning-release-loop: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-learning-release-loop: failed", error);
  process.exit(1);
});
