import assert from "node:assert/strict";
import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

type MockCase = "degraded-fallback" | "blocked";

function buildStrategistPayload(kind: MockCase) {
  if (kind === "blocked") {
    return {
      analyticsId: 1,
      locationId: 1,
      weekStartDate: "2026-02-16",
      contract: {
        surface: "agent:marketer-strategist",
        contractVersion: "v1",
        readiness: "blocked",
        confidence: "blocked",
        context: {
          persona: "marketer",
          locationId: 1,
          analyticsId: 1,
          trust: { qualityStatus: "failed", reasons: ["data_readiness_blocked"] },
          lineage: { pipelineRunId: "run_mock", ingestedAtUtc: "2026-02-18T00:00:00.000Z", sourceSystem: "mock" },
        },
        evidence: [],
      },
      strategist: {
        status: "blocked",
        reason_code: "LLM_GUARDRAIL_BLOCKED",
        run: {
          model_id: "gpt-4o-mini",
          prompt_version: "v1-draft",
          llm_provider: "mock",
          llm_mode: "deterministic",
          llm_status: "blocked",
        },
        plan: { headline: "Blocked by LLM guardrail policy.", priorities: [] },
      },
    };
  }

  return {
    analyticsId: 1,
    locationId: 1,
    weekStartDate: "2026-02-16",
    contract: {
      surface: "agent:marketer-strategist",
      contractVersion: "v1",
      readiness: "degraded",
      confidence: "medium",
      context: {
        persona: "marketer",
        locationId: 1,
        analyticsId: 1,
        trust: { qualityStatus: "warn", reasons: ["data_readiness_degraded"] },
        lineage: { pipelineRunId: "run_mock", ingestedAtUtc: "2026-02-18T00:00:00.000Z", sourceSystem: "mock" },
      },
      evidence: [],
    },
    strategist: {
      status: "degraded",
      reason_code: "LLM_FALLBACK_USED",
      run: {
        model_id: "gpt-4o-mini",
        prompt_version: "v1-draft",
        llm_provider: "mock",
        llm_mode: "deterministic",
        llm_status: "fallback",
      },
      plan: { headline: "Fallback used due to provider guardrail.", priorities: [] },
    },
  };
}

async function run() {
  await ensureE2eData({ testId: "agent-llm-guardrails-fallback", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let callCount = 0;
  await page.route("**/api/agents/strategist?*", async (route) => {
    callCount += 1;
    const kind: MockCase = callCount === 1 ? "degraded-fallback" : "blocked";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildStrategistPayload(kind)),
    });
  });

  await page.goto(`${baseUrl}/agents/marketer-strategist`, { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: /Run Sample Context/i }).first().click();
  await page.locator("[data-agent-output-trust-panel]").first().waitFor({ state: "visible", timeout: 30_000 });
  const degradedReadiness = await page.locator("[data-trust-readiness]").first().innerText();
  const degradedGuardrail = await page.locator("[data-trust-guardrail]").first().innerText();
  const degradedFallback = await page.locator("[data-trust-fallback]").first().innerText();
  const degradedLlmStatus = await page.locator("[data-run-llm-status]").first().innerText();

  assert(/degraded/i.test(degradedReadiness), `expected degraded readiness, got=${degradedReadiness}`);
  assert(/degraded/i.test(degradedGuardrail), `expected degraded guardrail, got=${degradedGuardrail}`);
  assert(/true/i.test(degradedFallback), `expected fallback=true, got=${degradedFallback}`);
  assert(/fallback/i.test(degradedLlmStatus), `expected llm fallback status, got=${degradedLlmStatus}`);

  await page.getByRole("button", { name: /Run Sample Context/i }).first().click();
  await page.locator("[data-agent-output-trust-panel]").first().waitFor({ state: "visible", timeout: 30_000 });
  const blockedReadiness = await page.locator("[data-trust-readiness]").first().innerText();
  const blockedGuardrail = await page.locator("[data-trust-guardrail]").first().innerText();
  const blockedLlmStatus = await page.locator("[data-run-llm-status]").first().innerText();

  assert(/blocked/i.test(blockedReadiness), `expected blocked readiness, got=${blockedReadiness}`);
  assert(/blocked/i.test(blockedGuardrail), `expected blocked guardrail, got=${blockedGuardrail}`);
  assert(/blocked/i.test(blockedLlmStatus), `expected llm blocked status, got=${blockedLlmStatus}`);

  await browser.close();
  console.log("[e2e] agent-llm-guardrails-fallback: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-llm-guardrails-fallback: failed", error);
  process.exit(1);
});
