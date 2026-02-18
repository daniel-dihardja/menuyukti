import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await ensureE2eData({ testId: "agent-llm-disabled-mechanical-mode", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/agents/agent-memory-tracker`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Run Sample Context/i }).click();

  await page.locator("[data-agent-output-trust-panel]").first().waitFor({ state: "visible", timeout: 30_000 });
  const llmStatusText = await page.locator("[data-run-llm-status]").first().innerText();
  assert(/llm:\s*disabled/i.test(llmStatusText), `expected llm disabled badge, got=${llmStatusText}`);

  const runHistoryPanel = page.locator("[data-agent-run-history-panel]").first();
  await runHistoryPanel.waitFor({ state: "visible", timeout: 30_000 });
  await page.locator("[data-agent-run-history-item]").first().waitFor({ state: "visible", timeout: 30_000 });

  const recordRejectedButton = page.getByRole("button", { name: /Record Rejected/i });
  await recordRejectedButton.waitFor({ state: "visible", timeout: 30_000 });
  await recordRejectedButton.click();

  const comparisonPanel = page.locator("[data-agent-run-comparison-panel]").first();
  await comparisonPanel.waitFor({ state: "visible", timeout: 30_000 });
  const diffNode = page.locator("[data-run-compare-diff]").first();
  await diffNode.waitFor({ state: "visible", timeout: 30_000 });
  const diffText = await diffNode.innerText();
  assert(/changed/i.test(diffText), "expected comparison diff to render in mechanical mode");

  await browser.close();
  console.log("[e2e] agent-llm-disabled-mechanical-mode: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-llm-disabled-mechanical-mode: failed", error);
  process.exit(1);
});
