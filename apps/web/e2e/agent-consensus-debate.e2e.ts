import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await ensureE2eData({ testId: "agent-consensus-debate", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  // Dependency: consensus consumes AS-04 profit intelligence recommendations.
  const primeResponse = await fetch(`${baseUrl}/api/agents/profit-intelligence?analyticsId=1`);
  assert(primeResponse.ok, `profit intelligence prime failed status=${primeResponse.status}`);

  const apiResponse = await fetch(
    `${baseUrl}/api/agents/consensus?analyticsId=1&mode=conservative`,
  );
  assert(apiResponse.ok, `consensus api failed status=${apiResponse.status}`);
  const apiBody = (await apiResponse.json()) as {
    contract?: { surface?: string; readiness?: string };
    consensus?: {
      status?: string;
      consensus?: { winner?: unknown; recommendations?: unknown[]; disagreement_reasons?: string[] };
    };
  };
  assert(apiBody.contract?.surface === "agent:multi-agent-consensus", "consensus contract surface mismatch");
  assert(
    apiBody.contract?.readiness === "ready" ||
      apiBody.contract?.readiness === "degraded" ||
      apiBody.contract?.readiness === "blocked",
    "consensus readiness missing",
  );
  assert(apiBody.consensus?.status !== undefined, "consensus status missing");
  assert(Array.isArray(apiBody.consensus?.consensus?.recommendations), "consensus recommendations missing");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/agents`, { waitUntil: "domcontentloaded" });
  await page.getByText(/multi-agent consensus/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await page.locator('a[href="/agents/multi-agent-consensus"]').first().click();
  await page.locator("#agent-location-select").click();
  await page.locator('[role="option"]').first().click();
  await page.locator("#agent-analytics-select").click();
  await page.locator('[role="option"]').first().click();
  await page.getByRole("button", { name: /run consensus/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /run consensus/i }).click();
  await page.getByText(/readiness:/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByText(/winner:/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await browser.close();
  console.log("[e2e] agent-consensus-debate: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-consensus-debate: failed", error);
  process.exit(1);
});
