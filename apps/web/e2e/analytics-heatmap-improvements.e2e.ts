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

  await page.getByText(/marketer focus/i).first().waitFor({ state: "visible", timeout: 10_000 });
  await page.getByText(/analyst focus/i).first().waitFor({ state: "visible", timeout: 10_000 });

  await page.fill("#heatmap-filter-search", "a");
  await page.fill("#heatmap-filter-top", "10");
  await page.locator("#heatmap-filter-segment").click();
  await page.getByRole("option", { name: "Weekdays", exact: true }).click();
  await page.getByRole("button", { name: "Apply Filters" }).click();

  await page.waitForURL((url) => {
    const current = new URL(url);
    return current.searchParams.get("q") === "a" && current.searchParams.get("segment") === "weekday";
  });

  await page.getByText(/readiness:/i).first().waitFor({ state: "visible", timeout: 10_000 });
  await page.getByText(/confidence:/i).first().waitFor({ state: "visible", timeout: 10_000 });

  const exportHref = await page.getByRole("link", { name: "Export Heatmap CSV" }).getAttribute("href");
  assert(exportHref, "Heatmap export link missing");

  const exportRes = await page.evaluate(async (href) => {
    const res = await fetch(href as string);
    return {
      ok: res.ok,
      status: res.status,
      body: await res.text(),
    };
  }, `${baseUrl}${exportHref}`);

  assert(exportRes.ok, `Heatmap export request failed (${exportRes.status})`);
  assert(
    exportRes.body.startsWith("dataset,generated_at,analytics_id,location_id"),
    "Heatmap export CSV header mismatch",
  );

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
