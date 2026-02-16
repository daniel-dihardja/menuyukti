import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const uploadPath =
  process.env.E2E_UPLOAD_FILE ??
  path.resolve(
    process.cwd(),
    "../../reports/Sales_Recapitulation_Detail_Report_Jan-Mar_2025.xlsx",
  );

async function waitForStatusMessage(page: import("playwright").Page) {
  const status = page.getByRole("status").first();
  await status.waitFor({ state: "visible", timeout: 90_000 });
  return (await status.textContent())?.trim() ?? "";
}

async function run() {
  if (!fs.existsSync(uploadPath)) {
    throw new Error(`Upload file not found: ${uploadPath}`);
  }

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

  let uploadResponseStatus: number | null = null;
  let uploadResponseBody = "";
  page.on("response", async (response) => {
    if (!response.url().includes("/api/analytics/create")) return;
    uploadResponseStatus = response.status();
    try {
      uploadResponseBody = await response.text();
    } catch {
      uploadResponseBody = "<failed to read response body>";
    }
  });

  const suffix = Date.now();
  const locationName = `E2E Sales ${suffix}`;

  await page.goto(`${baseUrl}/analytics/locations/create`, {
    waitUntil: "domcontentloaded",
  });
  await page.fill("#name", locationName);
  await page.getByRole("button", { name: "Create Location" }).click();
  await page.waitForURL("**/analytics/locations", { timeout: 30_000 });

  await page.goto(`${baseUrl}/analytics/sales`, {
    waitUntil: "domcontentloaded",
  });

  const locationTrigger = page.locator("#sales-location-select");
  await locationTrigger.waitFor({ state: "visible", timeout: 30_000 });
  await locationTrigger.click();
  await page.getByRole("option", { name: locationName, exact: true }).click();

  const uploadButton = page.getByRole("button", { name: /upload/i });
  await uploadButton.waitFor({ state: "visible", timeout: 30_000 });
  if (await uploadButton.isDisabled()) {
    throw new Error("Upload button is disabled after selecting location");
  }

  const uploadPromise = page.waitForResponse(
    (response) => response.url().includes("/api/analytics/create"),
    { timeout: 240_000 },
  );
  await page.setInputFiles("#analytics-upload-xlsx", uploadPath);
  await uploadPromise;

  const statusMessage = await waitForStatusMessage(page);
  const screenshotPath = path.join(artifactsDir, "analytics-sales-final.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const video = page.video();
  console.log(`[e2e] status-message: ${statusMessage}`);
  console.log(`[e2e] upload-status-code: ${uploadResponseStatus ?? "unknown"}`);
  const responsePreview =
    uploadResponseBody.length > 500
      ? `${uploadResponseBody.slice(0, 500)}...`
      : uploadResponseBody || "<empty>";
  console.log(`[e2e] upload-response-body: ${responsePreview}`);

  const passed =
    /uploaded|success/i.test(statusMessage) && uploadResponseStatus === 200;
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();
  console.log(`[e2e] screenshot: ${screenshotPath}`);
  console.log(`[e2e] video: ${videoPath ?? "<not-recorded>"}`);

  if (!passed) {
    throw new Error("E2E upload did not succeed");
  }
}

run().catch((error) => {
  console.error("[e2e] failed:", error);
  process.exit(1);
});
