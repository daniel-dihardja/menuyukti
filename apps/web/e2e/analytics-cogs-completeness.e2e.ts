import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const analyticsId = process.env.E2E_ANALYTICS_ID ?? "1";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchCsv(page: import("playwright").Page, url: string): Promise<string> {
  const result = await page.evaluate(async (target) => {
    const res = await fetch(target);
    return {
      ok: res.ok,
      status: res.status,
      body: await res.text(),
    };
  }, url);

  if (!result.ok) {
    throw new Error(`CSV fetch failed (${result.status}) for ${url}`);
  }
  return result.body;
}

async function run() {
  await ensureE2eData({ testId: "analytics-cogs-completeness", defaultPolicy: "reuse" });
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

  const cogsUrl = `${baseUrl}/analytics/${analyticsId}/cogs`;
  await page.goto(cogsUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /cogs editor/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByText(/edit cogs per menu item/i).first().waitFor({
    state: "visible",
    timeout: 10_000,
  });

  const exportUrl = new URL(`${baseUrl}/api/exports/analyst`);
  exportUrl.searchParams.set("dataset", "matrix");
  exportUrl.searchParams.set("analyticsId", analyticsId);
  const matrixCsv = await fetchCsv(page, exportUrl.toString());

  assert(
    matrixCsv.includes("has_valid_cogs,cogs_issue,cogs_item_coverage_ratio,cogs_revenue_coverage_ratio,cogs_readiness,cogs_readiness_reasons"),
    "Matrix export is missing COGS completeness/readiness columns",
  );

  const screenshotPath = path.join(artifactsDir, "analytics-cogs-completeness-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  console.log(`[e2e] cogs-url: ${cogsUrl}`);
  console.log(`[e2e] matrix-export-bytes: ${matrixCsv.length}`);
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath ?? "<not-recorded>"}`);
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
