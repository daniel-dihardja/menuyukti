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
    const body = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      body,
    };
  }, url);

  if (!result.ok) {
    throw new Error(`CSV fetch failed (${result.status}) for ${url}: ${result.body.slice(0, 300)}`);
  }
  return result.body;
}

async function run() {
  await ensureE2eData({ testId: "analytics-attribution-workflow", defaultPolicy: "reuse" });
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

  const attributionUrl = `${baseUrl}/analytics/${analyticsId}/attribution`;
  await page.goto(attributionUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /instagram attribution overview/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });

  const avgDeltaRevenueCard = page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Avg Delta Revenue" })
    .first();
  await avgDeltaRevenueCard.waitFor({ state: "visible", timeout: 10_000 });
  const avgDeltaRevenueText = await avgDeltaRevenueCard.textContent();
  assert(
    !(avgDeltaRevenueText ?? "").includes("$"),
    "Avg Delta Revenue must not render a hardcoded '$' currency symbol",
  );

  await page.locator('input[name="minActiveDays"]').fill("3");
  await page.locator('input[name="minCoverageRatio"]').fill("0.75");
  await page.getByRole("button", { name: /apply confidence thresholds/i }).click();
  await page.waitForURL((url) => {
    const current = new URL(url);
    return current.searchParams.get("minActiveDays") === "3" && current.searchParams.get("minCoverageRatio") === "0.75";
  });

  const hasRows = await page
    .locator("table tbody tr")
    .first()
    .isVisible()
    .catch(() => false);
  if (!hasRows) {
    await page.getByText(/no attribution records yet/i).first().waitFor({
      state: "visible",
      timeout: 10_000,
    });
  }

  const exportUrl = new URL(`${baseUrl}/api/exports/analyst`);
  exportUrl.searchParams.set("dataset", "attribution");
  exportUrl.searchParams.set("analyticsId", analyticsId);
  exportUrl.searchParams.set("minActiveDays", "3");
  exportUrl.searchParams.set("minCoverageRatio", "0.75");
  const csv = await fetchCsv(page, exportUrl.toString());
  assert(
    csv.startsWith("dataset,generated_at,analytics_id,location_id"),
    "Attribution export header columns are missing",
  );

  const screenshotPath = path.join(artifactsDir, "analytics-attribution-workflow-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  console.log(`[e2e] attribution-url: ${attributionUrl}`);
  console.log(`[e2e] attribution-export-bytes: ${csv.length}`);
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath ?? "<not-recorded>"}`);
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
