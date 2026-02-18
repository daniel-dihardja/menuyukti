import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await ensureE2eData({ testId: "agent-strategist-weekly-plan", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const apiResponse = await fetch(`${baseUrl}/api/agents/strategist?analyticsId=1`);
  assert(apiResponse.ok, `strategist api failed status=${apiResponse.status}`);
  const apiBody = (await apiResponse.json()) as {
    contract?: { surface?: string; readiness?: string };
    strategist?: { status?: string; plan?: { priorities?: unknown[] } };
  };
  assert(apiBody.contract?.surface === "agent:marketer-strategist", "strategist contract surface mismatch");
  assert(
    apiBody.contract?.readiness === "ready" ||
      apiBody.contract?.readiness === "degraded" ||
      apiBody.contract?.readiness === "blocked",
    "strategist readiness missing",
  );
  assert(apiBody.strategist?.status !== undefined, "strategist status missing");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/agents`, { waitUntil: "domcontentloaded" });
  await page.getByText(/instagram growth strategist/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await page.locator('a[href="/agents/marketer-strategist"]').first().click();
  await page.locator("#agent-location-select").click();
  await page.locator('[role="option"]').first().click();
  await page.locator("#agent-analytics-select").click();
  await page.locator('[role="option"]').first().click();
  await page.getByRole("button", { name: /generate weekly plan/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /generate weekly plan/i }).click();
  await page.getByText(/readiness:/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await browser.close();
  console.log("[e2e] agent-strategist-weekly-plan: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-strategist-weekly-plan: failed", error);
  process.exit(1);
});
