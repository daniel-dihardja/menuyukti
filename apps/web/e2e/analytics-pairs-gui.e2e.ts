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
  const route = `${baseUrl}/analytics/${analyticsId}/pairs`;

  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /top pair menu insights/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await page.fill("#pair-filter-search", "a");
  await page.fill("#pair-filter-min-sample", "1");
  await page.fill("#pair-filter-min-lift", "1");
  await page.fill("#pair-filter-min-confidence", "0");
  await page.getByRole("button", { name: "Apply Filters" }).click();

  await page.waitForURL((url) => {
    const current = new URL(url);
    return current.searchParams.get("q") === "a" && current.searchParams.get("minSampleSize") === "1";
  });

  const pairSectionVisible = await page
    .getByRole("heading", { name: /top pair menu items/i })
    .isVisible();
  assert(pairSectionVisible, "Top pair menu section is not visible");

  const explainButtons = page.getByRole("button", { name: "Explain" });
  const explainCount = await explainButtons.count();
  if (explainCount > 0) {
    await explainButtons.first().click();
    await page.getByText(/deterministic metrics that drive this ranking/i).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.keyboard.press("Escape");
  }

  const pairExportHref = await page
    .getByRole("link", { name: "Export Pairs CSV" })
    .getAttribute("href");
  const comboExportHref = await page
    .getByRole("link", { name: "Export Combos CSV" })
    .getAttribute("href");

  assert(pairExportHref, "Pairs export link missing");
  assert(comboExportHref, "Combos export link missing");

  const pairRes = await page.evaluate(async (href) => {
    const res = await fetch(href as string);
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  }, `${baseUrl}${pairExportHref}`);

  assert(pairRes.ok, `Pairs export request failed (${pairRes.status})`);
  assert(
    pairRes.body.startsWith("dataset,generated_at,from_date,to_date,location_id"),
    "Pairs export CSV header mismatch",
  );

  const comboRes = await page.evaluate(async (href) => {
    const res = await fetch(href as string);
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  }, `${baseUrl}${comboExportHref}`);

  assert(comboRes.ok, `Combos export request failed (${comboRes.status})`);
  assert(
    comboRes.body.startsWith("dataset,generated_at,from_date,to_date,location_id"),
    "Combos export CSV header mismatch",
  );

  const screenshotPath = path.join(artifactsDir, "analytics-pairs-gui-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  console.log(`[e2e] pairs-route: ${route}`);
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath ?? "<not-recorded>"}`);
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
