import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const analyticsId = process.env.E2E_ANALYTICS_ID ?? "1";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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
  const route = `${baseUrl}/analytics/${analyticsId}/scheduler`;

  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /instagram weekly scheduler/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByText(/weekly heatmap suggestions/i).first().waitFor({ state: "visible", timeout: 20_000 });

  const start = Date.now();
  while (Date.now() - start < 20_000) {
    const useCount = await page.getByRole("button", { name: /Use Suggestion/i }).count();
    const generateCount = await page.getByRole("button", { name: /Generate Post/i }).count();
    if (useCount > 0) {
      await page.getByRole("button", { name: /Use Suggestion/i }).first().click();
      break;
    }
    if (generateCount > 0) {
      await page.getByRole("button", { name: /Generate Post/i }).first().click();
      break;
    }
    await page.waitForTimeout(500);
  }

  await page.getByText(/Post Composer/i).first().waitFor({ state: "visible", timeout: 15_000 });

  await page.getByLabel("CTA").fill("Visit us today and mention this post.");
  await page.getByRole("button", { name: /Apply To Schedule/i }).click();

  await page.getByText(/Composer draft applied to schedule entries/i).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.getByText(/Schedule saved|SCHEDULER_BLOCKED_BY_READINESS/i).first().waitFor({
    state: "visible",
    timeout: 20_000,
  });

  const rows = await page.locator("table tbody tr").count();
  assert(rows > 0, "No schedule rows found after applying composer draft");

  const screenshotPath = path.join(artifactsDir, "analytics-scheduler-post-generation-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  console.log(`[e2e] scheduler-post-generation-route: ${route}`);
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath ?? "<not-recorded>"}`);
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
