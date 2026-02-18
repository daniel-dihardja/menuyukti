import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await ensureE2eData({ testId: "agent-run-comparison", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/agents/agent-memory-tracker`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Run Sample Context/i }).click();
  await page.getByRole("button", { name: /Record Rejected/i }).click();

  await page.locator("[data-agent-run-comparison-panel]").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.locator("[data-run-compare-diff]").first().waitFor({ state: "visible", timeout: 30_000 });
  const diffText = await page.locator("[data-run-compare-diff]").first().innerText();
  assert(/action/i.test(diffText), "comparison diff missing action field");
  assert(/changed/i.test(diffText), "comparison diff missing changed marker");

  await browser.close();
  console.log("[e2e] agent-run-comparison: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-run-comparison: failed", error);
  process.exit(1);
});
