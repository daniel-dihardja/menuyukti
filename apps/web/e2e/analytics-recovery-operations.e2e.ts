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

  const screenshotPath = path.join(artifactsDir, "analytics-recovery-operations-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  console.log(`[e2e] operations-url: ${operationsUrl}`);
  console.log(`[e2e] list-status: ${listResult.status}`);
  console.log(`[e2e] guardrail-status: ${invalidBackfillResult.status}`);
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath ?? "<not-recorded>"}`);
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
