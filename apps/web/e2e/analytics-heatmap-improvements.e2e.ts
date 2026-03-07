import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const analyticsId = process.env.E2E_ANALYTICS_ID ?? "1";

async function run() {
  await ensureE2eData({ testId: "analytics-heatmap-improvements", defaultPolicy: "reuse" });
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

  const route = `${baseUrl}/analytics/${analyticsId}/heatmap`;
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /menu sales heatmap/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });

  const screenshotPath = path.join(artifactsDir, "analytics-heatmap-improvements-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  console.log(`[e2e] heatmap-route: ${route}`);
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath ?? "<not-recorded>"}`);
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
