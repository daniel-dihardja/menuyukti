import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const locationId = process.env.E2E_LOCATION_ID ?? "1";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const artifactsDir = path.resolve(process.cwd(), "e2e-artifacts");
  const videosDir = path.join(artifactsDir, "videos");
  fs.mkdirSync(videosDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: {
      dir: videosDir,
      size: { width: 1280, height: 720 },
    },
  });
  const page = await context.newPage();

  const operationsUrl = `${baseUrl}/analytics/operations`;
  await page.goto(operationsUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /pipeline operations/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByText(/trigger operation/i).first().waitFor({
    state: "visible",
    timeout: 10_000,
  });

  const listResult = await page.evaluate(
    async ({ locationId, baseUrl }) => {
      const res = await fetch(
        `${baseUrl}/api/etl/operations?locationId=${encodeURIComponent(locationId)}&limit=5`,
      );
      return {
        ok: res.ok,
        status: res.status,
        body: await res.text(),
      };
    },
    { locationId, baseUrl },
  );
  assert(listResult.ok, `Operations list failed (${listResult.status}): ${listResult.body}`);

  await page.getByText(/etl run history/i).first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.getByText(/quality hints/i).first().waitFor({
    state: "visible",
    timeout: 10_000,
  });

  const runsResult = await page.evaluate(
    async ({ locationId, baseUrl }) => {
      const res = await fetch(`${baseUrl}/api/etl/runs?locationId=${encodeURIComponent(locationId)}&limit=10`);
      return {
        ok: res.ok,
        status: res.status,
        body: await res.text(),
      };
    },
    { locationId, baseUrl },
  );
  assert(runsResult.ok, `Run history list failed (${runsResult.status}): ${runsResult.body}`);

  const failedRunsFilterResult = await page.evaluate(
    async ({ locationId, baseUrl }) => {
      const res = await fetch(
        `${baseUrl}/api/etl/runs?locationId=${encodeURIComponent(locationId)}&status=failed&limit=5`,
      );
      const body = await res.json().catch(() => null);
      return {
        ok: res.ok,
        status: res.status,
        body,
      };
    },
    { locationId, baseUrl },
  );
  assert(
    failedRunsFilterResult.ok && Array.isArray(failedRunsFilterResult.body?.runs),
    `Failed-status run filter failed (${failedRunsFilterResult.status}): ${JSON.stringify(failedRunsFilterResult.body)}`,
  );
  const allFailed = (failedRunsFilterResult.body?.runs ?? []).every(
    (run: { status?: string }) => run.status === "failed",
  );
  assert(allFailed, "Status filter returned non-failed run");

  const invalidBackfillResult = await page.evaluate(
    async ({ locationId, baseUrl }) => {
      const res = await fetch(`${baseUrl}/api/etl/operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "backfill",
          locationId: Number(locationId),
          fromDate: "2026-01-01",
          toDate: "2026-03-15",
          reason: "e2e guardrail check",
        }),
      });
      return {
        ok: res.ok,
        status: res.status,
        body: await res.text(),
      };
    },
    { locationId, baseUrl },
  );

  assert(
    invalidBackfillResult.status === 400 || invalidBackfillResult.status === 409,
    `Expected guardrail status for oversized/conflicting backfill, got ${invalidBackfillResult.status}: ${invalidBackfillResult.body}`,
  );

  const replayButton = page.locator("button:has-text('Replay'):not([disabled])");
  const replayCount = await replayButton.count();
  if (replayCount > 0) {
    await replayButton.first().click();
    await page
      .getByText(/replay request queued|replay request reused existing idempotent operation|SOURCE_PIPELINE_RUN_NOT_FOUND|OPERATION_CONFLICT_ACTIVE_RUN|RETRY_REQUIRES_FAILED_SOURCE_RUN/i)
      .first()
      .waitFor({
        state: "visible",
        timeout: 15_000,
      });
  } else {
    console.log("[e2e] replay-shortcut: skipped (no run with pipeline id available)");
  }

  const screenshotPath = path.join(artifactsDir, "analytics-recovery-operations-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  console.log(`[e2e] operations-url: ${operationsUrl}`);
  console.log(`[e2e] list-status: ${listResult.status}`);
  console.log(`[e2e] runs-list-status: ${runsResult.status}`);
  console.log(`[e2e] failed-runs-filter-status: ${failedRunsFilterResult.status}`);
  console.log(`[e2e] guardrail-status: ${invalidBackfillResult.status}`);
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath ?? "<not-recorded>"}`);
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
