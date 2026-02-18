import assert from "node:assert/strict";
import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

async function run() {
  await ensureE2eData({ testId: "agent-prompt-model-visibility", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/agents/marketer-strategist`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Run Sample Context/i }).first().click();

  await page.locator("[data-run-model-id]").first().waitFor({ state: "visible", timeout: 45_000 });
  await page.locator("[data-run-prompt-version]").first().waitFor({ state: "visible", timeout: 45_000 });
  await page.locator("[data-run-llm-provider]").first().waitFor({ state: "visible", timeout: 45_000 });
  await page.locator("[data-run-llm-status]").first().waitFor({ state: "visible", timeout: 45_000 });

  const modelText = await page.locator("[data-run-model-id]").first().innerText();
  const promptText = await page.locator("[data-run-prompt-version]").first().innerText();
  assert(/model:/i.test(modelText), "model badge missing expected label");
  assert(/prompt:/i.test(promptText), "prompt badge missing expected label");

  await browser.close();
  console.log("[e2e] agent-prompt-model-visibility: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-prompt-model-visibility: failed", error);
  process.exit(1);
});
