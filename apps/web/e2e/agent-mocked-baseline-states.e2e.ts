import assert from "node:assert/strict";
import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function strategistPayload(kind: "degraded" | "blocked") {
  return {
    analyticsId: 1,
    locationId: 1,
    weekStartDate: "2026-02-18",
    contract: {
      surface: "agent:marketer-strategist",
      contractVersion: "v1",
      readiness: kind,
      confidence: kind === "blocked" ? "blocked" : "medium",
      context: {
        persona: "marketer",
        locationId: 1,
        analyticsId: 1,
        trust: { qualityStatus: kind === "blocked" ? "failed" : "warn", reasons: ["mocked_baseline_state"] },
        lineage: { pipelineRunId: "run_mock", ingestedAtUtc: "2026-02-18T00:00:00.000Z", sourceSystem: "mock" },
      },
      evidence: [],
    },
    strategist: {
      status: kind,
      reason_code: kind === "blocked" ? "LLM_GUARDRAIL_BLOCKED" : "LLM_FALLBACK_USED",
      run: {
        model_id: "gpt-4o-mini",
        prompt_version: "v1-draft",
        llm_provider: "mock",
        llm_mode: "deterministic",
        llm_status: kind === "blocked" ? "blocked" : "fallback",
      },
      plan: { headline: `Mocked ${kind} strategist output`, priorities: [] },
    },
  };
}

async function run() {
  await ensureE2eData({ testId: "agent-mocked-baseline-states", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let strategistCalls = 0;
  await page.route("**/api/agents/strategist?*", async (route) => {
    strategistCalls += 1;
    if (strategistCalls === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(strategistPayload("degraded")),
      });
      return;
    }
    if (strategistCalls === 2) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(strategistPayload("blocked")),
      });
      return;
    }
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "INVALID_CONTEXT",
        contract: {
          surface: "agent:marketer-strategist",
          contractVersion: "v1",
          readiness: "blocked",
          confidence: "blocked",
          context: {
            persona: "marketer",
            locationId: 1,
            analyticsId: 1,
            trust: { qualityStatus: "failed", reasons: ["invalid_context"] },
          },
          evidence: [],
        },
      }),
    });
  });

  await page.goto(`${baseUrl}/agents/marketer-strategist`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Run Sample Context/i }).first().click();
  await page.locator("[data-agent-output-trust-panel]").first().waitFor({ state: "visible", timeout: 30_000 });
  assert(/degraded/i.test(await page.locator("[data-trust-readiness]").first().innerText()));
  assert(/true/i.test(await page.locator("[data-trust-fallback]").first().innerText()));

  await page.getByRole("button", { name: /Run Sample Context/i }).first().click();
  await page.locator("[data-agent-output-trust-panel]").first().waitFor({ state: "visible", timeout: 30_000 });
  assert(/blocked/i.test(await page.locator("[data-trust-readiness]").first().innerText()));
  assert(/blocked/i.test(await page.locator("[data-run-llm-status]").first().innerText()));

  await page.getByRole("button", { name: /Run Sample Context/i }).first().click();
  await page.getByText("INVALID_CONTEXT").first().waitFor({ state: "visible", timeout: 30_000 });

  await page.route("**/api/agents/profit-intelligence?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        contract: {
          surface: "agent:menu-profit-intelligence",
          contractVersion: "v1",
          readiness: "ready",
          confidence: "high",
          context: {
            persona: "analyst",
            locationId: 1,
            analyticsId: 1,
            trust: { qualityStatus: "passed", reasons: [] },
          },
          evidence: [],
        },
        profitIntelligence: {
          status: "accepted",
          run: {
            model_id: "gpt-4o-mini",
            prompt_version: "v1-draft",
            llm_provider: "mock",
            llm_mode: "mock",
            llm_status: "used",
          },
          board: { headline: "prime", recommendations: [] },
        },
      }),
    });
  });
  await page.route("**/api/agents/profit-intelligence/reranked?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        contract: {
          surface: "agent:feedback-reranker",
          contractVersion: "v1",
          readiness: "degraded",
          confidence: "medium",
          context: {
            persona: "analyst",
            locationId: 1,
            analyticsId: 1,
            trust: { qualityStatus: "warn", reasons: ["fallback_to_baseline_due_to_weak_signals"] },
          },
          evidence: [],
        },
        reranked: {
          run: {
            model_id: "gpt-4o-mini",
            prompt_version: "v1-draft",
            llm_provider: "mock",
            llm_mode: "deterministic",
            llm_status: "fallback",
          },
          policy_version: "as10-v1",
          fallback_to_baseline: true,
          signal_count: 0,
          recommendations: [],
        },
      }),
    });
  });

  await page.goto(`${baseUrl}/agents/feedback-reranker`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Run Sample Context/i }).first().click();
  await page.locator("[data-agent-output-trust-panel]").first().waitFor({ state: "visible", timeout: 30_000 });
  assert(/true/i.test(await page.locator("[data-trust-fallback]").first().innerText()));
  assert(/degraded/i.test(await page.locator("[data-trust-guardrail]").first().innerText()));

  await browser.close();
  console.log("[e2e] agent-mocked-baseline-states: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-mocked-baseline-states: failed", error);
  process.exit(1);
});
