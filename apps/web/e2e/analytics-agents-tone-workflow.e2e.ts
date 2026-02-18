import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  await ensureE2eData({ testId: "analytics-agents-tone-workflow", defaultPolicy: "reuse" });
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

  const route = `${baseUrl}/agents/tone`;
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /tone/i }).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });

  const locationSelect = page.locator("#agent-location-select");
  await locationSelect.waitFor({ state: "visible", timeout: 30_000 });
  await locationSelect.click();
  const firstLocationOption = page.getByRole("option").first();
  await firstLocationOption.waitFor({ state: "visible", timeout: 10_000 });
  await firstLocationOption.click();

  const reportSelect = page.locator("#agent-analytics-select");
  await reportSelect.waitFor({ state: "visible", timeout: 30_000 });
  await reportSelect.click();
  const firstReportOption = page.getByRole("option").first();
  await firstReportOption.waitFor({ state: "visible", timeout: 10_000 });
  await firstReportOption.click();

  const runButton = page.locator('button[aria-controls="tone-agent-output"]').first();
  await runButton.waitFor({ state: "visible", timeout: 10_000 });
  const postResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/agents/tone") &&
      response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await runButton.click();
  const postResponse = await postResponsePromise;

  const outputRegion = page.locator("#tone-agent-output");
  await outputRegion.waitFor({ state: "visible", timeout: 10_000 });

  if (postResponse.status() === 200) {
    await outputRegion.getByText(/tone profile/i).first().waitFor({
      state: "visible",
      timeout: 20_000,
    });
  } else if (postResponse.status() === 412) {
    await outputRegion.getByText(/AGENT_DATA_NOT_READY/i).first().waitFor({
      state: "visible",
      timeout: 20_000,
    });
  } else {
    const body = await postResponse.text().catch(() => "<failed to read body>");
    throw new Error(`Tone run returned unexpected status ${postResponse.status()}: ${body}`);
  }

  const screenshotPath = path.join(artifactsDir, "analytics-agents-tone-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  assert(Boolean(videoPath), "Video path missing");
  console.log(`[e2e] agents-tone-route: ${route}`);
  console.log(`[e2e] agents-tone-status: ${postResponse.status()}`);
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath}`);
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
