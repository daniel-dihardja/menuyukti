import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await ensureE2eData({ testId: "agent-what-if-simulation", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const apiResponse = await fetch(`${baseUrl}/api/agents/simulation?analyticsId=1&mode=conservative`);
  assert(apiResponse.ok, `simulation api failed status=${apiResponse.status}`);
  const apiBody = (await apiResponse.json()) as {
    contract?: { surface?: string; readiness?: string };
    simulation?: {
      status?: string;
      simulation?: { winner?: unknown; ranked_scenarios?: unknown[] };
    };
  };
  assert(apiBody.contract?.surface === "agent:what-if-simulation", "simulation contract surface mismatch");
  assert(
    apiBody.contract?.readiness === "ready" ||
      apiBody.contract?.readiness === "degraded" ||
      apiBody.contract?.readiness === "blocked",
    "simulation readiness missing",
  );
  assert(apiBody.simulation?.status !== undefined, "simulation status missing");
  assert(
    Array.isArray(apiBody.simulation?.simulation?.ranked_scenarios) &&
      (apiBody.simulation?.simulation?.ranked_scenarios?.length ?? 0) >= 2,
    "expected at least 2 ranked scenarios",
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/agents`, { waitUntil: "domcontentloaded" });
  await page.getByText(/what-if simulation studio/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await page.locator('a[href="/agents/what-if-simulation"]').first().click();
  await page.locator("#agent-location-select").click();
  await page.locator('[role="option"]').first().click();
  await page.locator("#agent-analytics-select").click();
  await page.locator('[role="option"]').first().click();
  await page.getByRole("button", { name: /run what-if/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /run what-if/i }).click();
  await page.getByText(/readiness:/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByText(/winner:/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await browser.close();
  console.log("[e2e] agent-what-if-simulation: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-what-if-simulation: failed", error);
  process.exit(1);
});
