import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const analyticsId = process.env.E2E_ANALYTICS_ID ?? "1";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await ensureE2eData({ testId: "analytics-scheduler-workflow", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);
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
  const route = `${baseUrl}/analytics/${analyticsId}/scheduler`;

  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /instagram weekly scheduler/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });

  const addBlankButton = page.getByRole("button", { name: "Add Blank Entry" });
  const rowLocator = page.locator("table tbody tr");
  let rowCount = await rowLocator.count();
  for (let attempt = 0; attempt < 5 && rowCount === 0; attempt += 1) {
    await addBlankButton.click();
    await page.waitForTimeout(400);
    rowCount = await rowLocator.count();
  }
  assert(rowCount > 0, "Scheduler row did not appear after Add Blank Entry");

  const firstRow = rowLocator.first();
  await firstRow.waitFor({ state: "visible", timeout: 10_000 });

  const menuInput = firstRow.locator("input").first();
  await menuInput.fill("E2E Scheduler Item");

  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.getByText(/schedule saved|SCHEDULER_BLOCKED_BY_READINESS/i).first().waitFor({
    state: "visible",
    timeout: 20_000,
  });

  const readinessBadge = page.getByText(/readiness:/i).first();
  await readinessBadge.waitFor({ state: "visible", timeout: 10_000 });
  assert(await readinessBadge.isVisible(), "Readiness badge not visible in scheduler UI");

  const trustLegendVisible = await page.getByText(/High trust/i).first().isVisible();
  assert(trustLegendVisible, "Trust legend missing in scheduler UI");

  const screenshotPath = path.join(artifactsDir, "analytics-scheduler-workflow-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  console.log(`[e2e] scheduler-route: ${route}`);
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath ?? "<not-recorded>"}`);
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
