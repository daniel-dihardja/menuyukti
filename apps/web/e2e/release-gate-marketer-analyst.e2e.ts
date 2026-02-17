import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const analyticsId = process.env.E2E_ANALYTICS_ID ?? "1";
const locationId = process.env.E2E_LOCATION_ID ?? "1";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchCsv(page: import("playwright").Page, url: string): Promise<string> {
  const result = await page.evaluate(async (target) => {
    const res = await fetch(target);
    const body = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      body,
    };
  }, url);

  if (!result.ok) {
    const preview = result.body.length > 400 ? `${result.body.slice(0, 400)}...` : result.body;
    throw new Error(`CSV fetch failed (${result.status}) for ${url}: ${preview}`);
  }

  return result.body;
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

  const matrixUrl = `${baseUrl}/analytics/${analyticsId}/matrix`;
  await page.goto(matrixUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /menu engineering matrix/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Push Winners" }).click();
  await page.waitForURL((url) => {
    const current = new URL(url);
    const categories = current.searchParams.get("categories") ?? "";
    const actions = current.searchParams.get("actions") ?? "";
    return categories.includes("star") && actions.includes("promote");
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

  const currentUrl = new URL(page.url());
  const matrixExportUrl = new URL(`${baseUrl}/api/exports/analyst`);
  matrixExportUrl.searchParams.set("dataset", "matrix");
  matrixExportUrl.searchParams.set("analyticsId", analyticsId);
  currentUrl.searchParams.forEach((value, key) => {
    matrixExportUrl.searchParams.set(key, value);
  });

  const matrixCsv = await fetchCsv(page, matrixExportUrl.toString());
  assert(
    matrixCsv.startsWith("dataset,generated_at,analytics_id,location_id"),
    "Matrix export is missing expected header columns",
  );
  assert(
    matrixCsv.includes("has_valid_cogs,cogs_issue,cogs_item_coverage_ratio,cogs_revenue_coverage_ratio,cogs_readiness,cogs_readiness_reasons"),
    "Matrix export is missing COGS completeness/readiness columns",
  );

  const heatmapUrl = `${baseUrl}/analytics/${analyticsId}/heatmap`;
  await page.goto(heatmapUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /menu sales heatmap/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByRole("heading", { name: /marketer focus/i }).waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.getByText(/readiness:/i).first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
  const heatmapExportHref = await page
    .getByRole("link", { name: "Export Heatmap CSV" })
    .getAttribute("href");
  assert(heatmapExportHref, "Heatmap export link missing");
  const heatmapCsv = await fetchCsv(page, `${baseUrl}${heatmapExportHref}`);
  assert(
    heatmapCsv.startsWith("dataset,generated_at,analytics_id,location_id"),
    "Heatmap export is missing expected header columns",
  );

  const schedulerUrl = `${baseUrl}/analytics/${analyticsId}/scheduler`;
  await page.goto(schedulerUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /instagram weekly scheduler/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Add Blank Entry" }).click();
  const schedulerFirstRow = page.locator("table tbody tr").first();
  await schedulerFirstRow.waitFor({ state: "visible", timeout: 10_000 });
  await schedulerFirstRow.locator("input").first().fill("Release Gate Scheduler Item");
  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.getByText(/schedule saved|SCHEDULER_BLOCKED_BY_READINESS/i).first().waitFor({
    state: "visible",
    timeout: 20_000,
  });
  await page.getByText(/readiness:/i).first().waitFor({
    state: "visible",
    timeout: 10_000,
  });

  const attributionUrl = `${baseUrl}/analytics/${analyticsId}/attribution`;
  await page.goto(attributionUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /instagram attribution overview/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /apply confidence thresholds/i }).waitFor({
    state: "visible",
    timeout: 10_000,
  });

  const attributionExportUrl = new URL(`${baseUrl}/api/exports/analyst`);
  attributionExportUrl.searchParams.set("dataset", "attribution");
  attributionExportUrl.searchParams.set("analyticsId", analyticsId);
  attributionExportUrl.searchParams.set("limit", "50");
  const attributionCsv = await fetchCsv(page, attributionExportUrl.toString());
  assert(
    attributionCsv.startsWith("dataset,generated_at,analytics_id,location_id"),
    "Attribution export is missing expected header columns",
  );

  const pairsExportUrl = new URL(`${baseUrl}/api/exports/analyst`);
  pairsExportUrl.searchParams.set("dataset", "pairs");
  pairsExportUrl.searchParams.set("locationId", locationId);
  pairsExportUrl.searchParams.set("minSampleSize", "1");
  const pairsCsv = await fetchCsv(page, pairsExportUrl.toString());
  assert(
    pairsCsv.startsWith("dataset,generated_at,from_date,to_date,location_id,menu_item_a_name"),
    "Pairs export is missing expected header columns",
  );

  const combosExportUrl = new URL(`${baseUrl}/api/exports/analyst`);
  combosExportUrl.searchParams.set("dataset", "combos");
  combosExportUrl.searchParams.set("locationId", locationId);
  combosExportUrl.searchParams.set("minPairOrders", "1");
  const combosCsv = await fetchCsv(page, combosExportUrl.toString());
  assert(
    combosCsv.startsWith("dataset,generated_at,from_date,to_date,location_id,menu_item_a_name"),
    "Combos export is missing expected header columns",
  );

  const runsListResult = await page.evaluate(
    async ({ baseUrl, locationId }) => {
      const res = await fetch(
        `${baseUrl}/api/etl/runs?locationId=${encodeURIComponent(locationId)}&limit=5`,
      );
      return {
        ok: res.ok,
        status: res.status,
        body: await res.text(),
      };
    },
    { baseUrl, locationId },
  );
  assert(
    runsListResult.ok,
    `ETL run-history list failed (${runsListResult.status}): ${runsListResult.body}`,
  );

  const screenshotPath = path.join(artifactsDir, "release-gate-marketer-analyst-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  console.log(`[e2e] matrix-url: ${matrixUrl}`);
  console.log(`[e2e] matrix-export-bytes: ${matrixCsv.length}`);
  console.log(`[e2e] attribution-export-bytes: ${attributionCsv.length}`);
  console.log(`[e2e] pairs-export-bytes: ${pairsCsv.length}`);
  console.log(`[e2e] combos-export-bytes: ${combosCsv.length}`);
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath ?? "<not-recorded>"}`);
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
