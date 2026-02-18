import assert from "node:assert/strict";
import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

async function run() {
  await ensureE2eData({ testId: "agent-prompt-tuning-loop", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const tuningResponse = await fetch(`${baseUrl}/api/agents/evaluation/prompt-tuning?mode=mock&agents=marketer-strategist`);
  assert.equal(tuningResponse.status, 200, "prompt tuning loop endpoint should return 200");
  const tuningBody = (await tuningResponse.json()) as {
    approved_prompt_versions?: Record<string, string>;
  };
  const approvedVersion = tuningBody.approved_prompt_versions?.["marketer-strategist"];
  assert.equal(typeof approvedVersion, "string", "approved prompt version missing for strategist");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/agents/marketer-strategist`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Run Sample Context/i }).first().click();

  await page.locator("[data-agent-output-trust-panel]").first().waitFor({ state: "visible", timeout: 45_000 });
  await page.locator("[data-run-prompt-version]").first().waitFor({ state: "visible", timeout: 45_000 });
  const promptBadge = await page.locator("[data-run-prompt-version]").first().innerText();
  const trustReadiness = await page.locator("[data-trust-readiness]").first().innerText();
  const llmStatus = await page.locator("[data-run-llm-status]").first().innerText();

  assert(promptBadge.includes(approvedVersion as string), `expected prompt badge to include ${approvedVersion}, got=${promptBadge}`);
  assert(/ready|degraded|blocked/i.test(trustReadiness), `unexpected trust readiness badge=${trustReadiness}`);
  assert(/used|fallback|disabled|blocked|skipped/i.test(llmStatus), `unexpected llm status badge=${llmStatus}`);

  await browser.close();
  console.log("[e2e] agent-prompt-tuning-loop: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-prompt-tuning-loop: failed", error);
  process.exit(1);
});
