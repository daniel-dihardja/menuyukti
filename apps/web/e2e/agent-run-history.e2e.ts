import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function fetchLatestRunId(): Promise<string | null> {
  const response = await fetch(
    `${baseUrl}/api/agents/run-history?agentId=agent-memory-tracker&locationId=1&analyticsId=1&limit=1`,
  );
  assert(response.ok, `run-history api failed status=${response.status}`);
  const payload = (await response.json()) as { runs?: Array<{ runId?: string | null }> };
  const runId = payload.runs?.[0]?.runId ?? null;
  return typeof runId === "string" && runId.length > 0 ? runId : null;
}

async function waitForRunIdChange(previousRunId: string, timeoutMs = 20_000): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const nextRunId = await fetchLatestRunId();
    if (nextRunId && nextRunId !== previousRunId) return nextRunId;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("run history did not update after second execution");
}

async function run() {
  await ensureE2eData({ testId: "agent-run-history", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/agents/agent-memory-tracker`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Run Sample Context/i }).click();
  await page.locator("[data-agent-run-history-panel]").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.locator("[data-agent-run-history-item]").first().waitFor({ state: "visible", timeout: 30_000 });
  const firstRunId = await fetchLatestRunId();
  assert(firstRunId, "first run-history row missing runId");

  const recordRejectedButton = page.getByRole("button", { name: /Record Rejected/i });
  await recordRejectedButton.waitFor({ state: "visible", timeout: 30_000 });
  await recordRejectedButton.click();
  const secondRunId = await waitForRunIdChange(firstRunId);
  assert(secondRunId !== firstRunId, "run history did not update after second execution");

  await browser.close();
  console.log("[e2e] agent-run-history: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-run-history: failed", error);
  process.exit(1);
});
