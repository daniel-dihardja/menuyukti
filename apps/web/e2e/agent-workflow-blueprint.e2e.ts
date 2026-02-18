import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const analyticsId = process.env.E2E_ANALYTICS_ID ?? "1";
const locationId = process.env.E2E_LOCATION_ID ?? "1";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await ensureE2eData({ testId: "agent-workflow-blueprint", defaultPolicy: "reuse" });
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

  await page.goto(`${baseUrl}/analytics/${analyticsId}/matrix`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /menu engineering matrix/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await page.goto(`${baseUrl}/analytics/${analyticsId}/scheduler`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /instagram weekly scheduler/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByText(/readiness:/i).first().waitFor({
    state: "visible",
    timeout: 10_000,
  });

  const pairMetricsResponse = await fetch(
    `${baseUrl}/api/marts/pair-metrics?locationId=${encodeURIComponent(locationId)}`,
  );
  assert(pairMetricsResponse.ok, `pair metrics failed status=${pairMetricsResponse.status}`);
  const pairMetricsBody = (await pairMetricsResponse.json()) as {
    contract?: { surface?: string; readiness?: string };
  };
  assert(pairMetricsBody.contract?.surface === "pairs", "pair metrics contract surface mismatch");

  const exportResponse = await fetch(
    `${baseUrl}/api/exports/analyst?dataset=matrix&analyticsId=${encodeURIComponent(analyticsId)}`,
  );
  assert(exportResponse.ok, `matrix export failed status=${exportResponse.status}`);
  const exportCsv = await exportResponse.text();
  assert(
    exportCsv.startsWith("dataset,generated_at,analytics_id,location_id"),
    "matrix export header mismatch",
  );

  await page.goto(`${baseUrl}/agents`, { waitUntil: "domcontentloaded" });
  await page.getByText(/legacy agents retired/i).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });

  const legacyAudienceRoute = await page.goto(`${baseUrl}/agents/audience`, {
    waitUntil: "domcontentloaded",
  });
  assert(legacyAudienceRoute?.status() === 404, "legacy audience page should be 404");

  const screenshotPath = path.join(artifactsDir, "agent-workflow-blueprint-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  console.log(`[e2e] agent-workflow-blueprint-matrix: ${baseUrl}/analytics/${analyticsId}/matrix`);
  console.log(
    `[e2e] agent-workflow-blueprint-scheduler: ${baseUrl}/analytics/${analyticsId}/scheduler`,
  );
  console.log(`[e2e] agent-workflow-blueprint-agents: ${baseUrl}/agents`);
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath ?? "<not-recorded>"}`);
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
