import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await ensureE2eData({ testId: "agent-feedback-reranking", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const baselineResponse = await fetch(`${baseUrl}/api/agents/profit-intelligence?analyticsId=1`);
  assert(baselineResponse.ok, `baseline generation failed status=${baselineResponse.status}`);
  const baselineBody = (await baselineResponse.json()) as {
    profitIntelligence?: {
      board?: {
        recommendations?: Array<{ recommendation_id?: string }>;
      };
    };
  };
  const recommendations = baselineBody.profitIntelligence?.board?.recommendations ?? [];
  assert(recommendations.length >= 2, "need at least 2 baseline recommendations");
  const recA = recommendations[0]?.recommendation_id;
  const recB = recommendations[1]?.recommendation_id;
  assert(typeof recA === "string" && recA.length > 0, "recA missing id");
  assert(typeof recB === "string" && recB.length > 0, "recB missing id");

  const eventBase = {
    locationId: 1,
    analyticsId: 1,
    persona: "analyst",
    sourceAgentId: "menu-profit-intelligence",
    signalType: "outcome_delta" as const,
    outcomeConfidence: "high" as const,
    sampleSize: 15,
  };
  const lowEvent = await fetch(`${baseUrl}/api/agents/learning/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...eventBase,
      recommendationId: recA,
      outcomeDeltaRevenue: -90,
      outcomeDeltaQty: -6,
    }),
  });
  assert(lowEvent.ok, `low event failed status=${lowEvent.status}`);

  const highEvent1 = await fetch(`${baseUrl}/api/agents/learning/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...eventBase,
      recommendationId: recB,
      outcomeDeltaRevenue: 240,
      outcomeDeltaQty: 16,
    }),
  });
  assert(highEvent1.ok, `high event 1 failed status=${highEvent1.status}`);
  const highEvent2 = await fetch(`${baseUrl}/api/agents/learning/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...eventBase,
      recommendationId: recB,
      outcomeDeltaRevenue: 190,
      outcomeDeltaQty: 12,
    }),
  });
  assert(highEvent2.ok, `high event 2 failed status=${highEvent2.status}`);
  const highEvent3 = await fetch(`${baseUrl}/api/agents/learning/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...eventBase,
      recommendationId: recB,
      outcomeDeltaRevenue: 210,
      outcomeDeltaQty: 14,
    }),
  });
  assert(highEvent3.ok, `high event 3 failed status=${highEvent3.status}`);

  const rerankedResponse = await fetch(
    `${baseUrl}/api/agents/profit-intelligence/reranked?analyticsId=1&minSignals=2&policyVersion=as10-v1`,
  );
  assert(rerankedResponse.ok, `reranked endpoint failed status=${rerankedResponse.status}`);
  const rerankedBody = (await rerankedResponse.json()) as {
    reranked?: {
      fallback_to_baseline?: boolean;
      recommendations?: Array<{
        recommendation_id?: string;
        baseline_rank?: number;
        final_rank?: number;
      }>;
    };
    contract?: { surface?: string };
  };
  assert(
    rerankedBody.contract?.surface === "agent:profit-intelligence-reranked",
    "reranked contract surface mismatch",
  );
  assert(rerankedBody.reranked?.fallback_to_baseline === false, "reranked should not fallback");
  const recRows = rerankedBody.reranked?.recommendations ?? [];
  const recBRow = recRows.find((row) => row.recommendation_id === recB);
  assert(recBRow, "reranked output missing recB");
  assert(
    (recBRow.final_rank ?? 999) <= (recBRow.baseline_rank ?? 999),
    "positive feedback recommendation should improve (or keep) rank",
  );

  const fallbackResponse = await fetch(
    `${baseUrl}/api/agents/profit-intelligence/reranked?analyticsId=1&minSignals=999&policyVersion=as10-v1`,
  );
  assert(fallbackResponse.ok, `fallback endpoint failed status=${fallbackResponse.status}`);
  const fallbackBody = (await fallbackResponse.json()) as {
    reranked?: { fallback_to_baseline?: boolean };
  };
  assert(fallbackBody.reranked?.fallback_to_baseline === true, "fallback should trigger on weak signal");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/agents`, { waitUntil: "domcontentloaded" });
  await page.getByText(/feedback reranker/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.locator('a[href="/agents/feedback-reranker"]').first().click();
  await page.locator("#agent-location-select").click();
  await page.locator('[role="option"]').first().click();
  await page.locator("#agent-analytics-select").click();
  await page.locator('[role="option"]').first().click();
  await page.getByRole("button", { name: /run re-ranking/i }).click();
  await page.getByText(/policy:/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await browser.close();

  console.log("[e2e] agent-feedback-reranking: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-feedback-reranking: failed", error);
  process.exit(1);
});
