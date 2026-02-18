import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await ensureE2eData({ testId: "agent-memory-continuity", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const saveResponse = await fetch(`${baseUrl}/api/agents/memory`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      locationId: 1,
      analyticsId: 1,
      recommendationId: `rec-e2e-${Date.now()}`,
      sourceAgentId: "menu-profit-intelligence",
      state: "accepted",
      rationale: "e2e_memory_signal",
    }),
  });
  assert(saveResponse.ok, `memory save failed status=${saveResponse.status}`);

  const getResponse = await fetch(`${baseUrl}/api/agents/memory?locationId=1&limit=10`);
  assert(getResponse.ok, `memory get failed status=${getResponse.status}`);
  const body = (await getResponse.json()) as {
    count?: number;
    events?: Array<{ state?: string; recommendationId?: string; version?: number }>;
    memoryContext?: { memory_context?: { continuity_signal?: string } };
  };
  assert((body.count ?? 0) > 0, "memory count should be > 0");
  assert(Array.isArray(body.events) && body.events.length > 0, "memory events missing");
  assert(typeof body.events?.[0]?.version === "number", "memory version missing");
  assert(
    body.memoryContext?.memory_context?.continuity_signal === "stable" ||
      body.memoryContext?.memory_context?.continuity_signal === "caution",
    "continuity signal missing",
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/agents`, { waitUntil: "domcontentloaded" });
  await page.getByText(/agent memory tracker/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await page.locator('a[href="/agents/agent-memory-tracker"]').first().click();
  await page.locator("#agent-location-select").click();
  await page.locator('[role="option"]').first().click();
  await page.locator("#agent-analytics-select").click();
  await page.locator('[role="option"]').first().click();
  await page.getByRole("button", { name: /record accepted/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /record accepted/i }).click();
  await page.getByText(/continuity:/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await browser.close();
  console.log("[e2e] agent-memory-continuity: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-memory-continuity: failed", error);
  process.exit(1);
});
