import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const analyticsId = process.env.E2E_ANALYTICS_ID ?? "1";

async function run() {
  await ensureE2eData({ testId: "analytics-matrix-filter-journey", defaultPolicy: "reuse" });
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

  const route = `${baseUrl}/analytics/${analyticsId}/matrix`;
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /menu engineering matrix/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Fix Pricing" }).click();
  await page.waitForURL(/actions=reprice/, { timeout: 15_000 });

  await page.fill("#matrix-filter-search", "a");
  await page.fill("#matrix-filter-margin-min", "0.2");
  await page.fill("#matrix-filter-margin-max", "0.8");
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await page.waitForURL((url) => {
    const current = new URL(url);
    return (
      current.searchParams.get("q") === "a" &&
      current.searchParams.get("marginMin") === "0.2" &&
      current.searchParams.get("marginMax") === "0.8"
    );
  });

  const hasRows = await page
    .locator("table tbody tr")
    .first()
    .isVisible()
    .catch(() => false);
  if (!hasRows) {
    await page
      .getByText(/no menu items match the current filters/i)
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
  }

  await page.getByRole("button", { name: "Reset" }).click();
  await page.waitForURL((url) => new URL(url).search === "", { timeout: 15_000 });

  const screenshotPath = path.join(artifactsDir, "analytics-matrix-filter-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  console.log(`[e2e] matrix-route: ${route}`);
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath ?? "<not-recorded>"}`);
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
