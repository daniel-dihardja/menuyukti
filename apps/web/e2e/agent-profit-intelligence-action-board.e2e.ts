import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await ensureE2eData({ testId: "agent-profit-intelligence-action-board", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const apiResponse = await fetch(`${baseUrl}/api/agents/profit-intelligence?analyticsId=1`);
  assert(apiResponse.ok, `profit intelligence api failed status=${apiResponse.status}`);
  const apiBody = (await apiResponse.json()) as {
    contract?: { surface?: string; readiness?: string };
    profitIntelligence?: { status?: string; board?: { recommendations?: unknown[] } };
    decisionPackage?: { matrixExportUrl?: string };
  };
  assert(
    apiBody.contract?.surface === "agent:menu-profit-intelligence",
    "profit intelligence contract surface mismatch",
  );
  assert(
    apiBody.contract?.readiness === "ready" ||
      apiBody.contract?.readiness === "degraded" ||
      apiBody.contract?.readiness === "blocked",
    "profit intelligence readiness missing",
  );
  assert(apiBody.profitIntelligence?.status !== undefined, "profit intelligence status missing");
  assert(typeof apiBody.decisionPackage?.matrixExportUrl === "string", "decision package export missing");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/agents`, { waitUntil: "domcontentloaded" });
  await page.getByText(/menu profit intelligence/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await page.locator('a[href="/agents/menu-profit-intelligence"]').first().click();
  await page.locator("#agent-location-select").click();
  await page.locator('[role="option"]').first().click();
  await page.locator("#agent-analytics-select").click();
  await page.locator('[role="option"]').first().click();
  await page.getByRole("button", { name: /generate action board/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /generate action board/i }).click();
  await page.getByText(/readiness:/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await browser.close();
  console.log("[e2e] agent-profit-intelligence-action-board: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-profit-intelligence-action-board: failed", error);
  process.exit(1);
});
