import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { MissionAction } from "./contracts";
import { buildPerceptionPayload } from "./perception";
import type { PlannerContext } from "./planner-contracts";

export type AdapterConfig = {
  runId: string;
  artifactsDir: string;
  stepTimeoutMs: number;
  retries: number;
  headless: boolean;
};

export type ActionExecutionResult = {
  ok: boolean;
  action: MissionAction;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  screenshotPath?: string;
  error?: string;
};

export type RuntimeSignal = {
  consoleErrors: string[];
  networkErrors: string[];
};

export class PlaywrightAdapter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private readonly config: AdapterConfig;
  private readonly signals: RuntimeSignal = { consoleErrors: [], networkErrors: [] };
  private lastScreenshotPath: string | null = null;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    const videosDir = path.join(this.config.artifactsDir, "videos");
    fs.mkdirSync(videosDir, { recursive: true });

    this.browser = await chromium.launch({ headless: this.config.headless });
    this.context = await this.browser.newContext({
      recordVideo: {
        dir: videosDir,
        size: { width: 1280, height: 720 },
      },
    });
    this.page = await this.context.newPage();
    this.attachSignalCollectors(this.page);
  }

  getSignals(): RuntimeSignal {
    return {
      consoleErrors: [...this.signals.consoleErrors],
      networkErrors: [...this.signals.networkErrors],
    };
  }

  getPageOrThrow(): Page {
    if (!this.page) throw new Error("Playwright adapter is not initialized");
    return this.page;
  }

  private attachSignalCollectors(page: Page) {
    page.on("console", (message) => {
      if (message.type() === "error") {
        this.signals.consoleErrors.push(message.text());
      }
    });

    page.on("response", (response) => {
      if (response.status() >= 400) {
        this.signals.networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });
  }

  private async executeOnce(action: MissionAction): Promise<ActionExecutionResult> {
    const page = this.getPageOrThrow();
    const startedAt = new Date().toISOString();
    const start = Date.now();

    try {
      if (action.type === "goto") {
        await page.goto(action.url, {
          waitUntil: "domcontentloaded",
          timeout: this.config.stepTimeoutMs,
        });
      } else if (action.type === "click") {
        await page.locator(action.selector).first().click({ timeout: this.config.stepTimeoutMs });
      } else if (action.type === "fill") {
        await page.locator(action.selector).first().fill(action.value, {
          timeout: this.config.stepTimeoutMs,
        });
      } else if (action.type === "press") {
        await page.keyboard.press(action.key);
      } else if (action.type === "waitFor") {
        await page.locator(action.selector).first().waitFor({
          state: "visible",
          timeout: this.config.stepTimeoutMs,
        });
      } else if (action.type === "screenshot") {
        const screenshotPath = path.join(
          this.config.artifactsDir,
          "screenshots",
          `${action.name}.png`,
        );
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        await page.screenshot({
          path: screenshotPath,
          fullPage: action.fullPage ?? true,
        });

        const endedAt = new Date().toISOString();
        this.lastScreenshotPath = screenshotPath;
        return {
          ok: true,
          action,
          startedAt,
          endedAt,
          durationMs: Date.now() - start,
          screenshotPath,
        };
      }

      const endedAt = new Date().toISOString();
      return {
        ok: true,
        action,
        startedAt,
        endedAt,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      const endedAt = new Date().toISOString();
      return {
        ok: false,
        action,
        startedAt,
        endedAt,
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async execute(action: MissionAction): Promise<ActionExecutionResult> {
    let result = await this.executeOnce(action);
    for (let attempt = 1; !result.ok && attempt <= this.config.retries; attempt += 1) {
      result = await this.executeOnce(action);
    }
    return result;
  }

  async buildPlannerContext(): Promise<PlannerContext> {
    return buildPerceptionPayload({
      page: this.getPageOrThrow(),
      runtimeSignals: this.getSignals(),
      screenshotPath: this.lastScreenshotPath,
    });
  }

  async close(): Promise<{ videoPath: string | null }> {
    if (!this.page || !this.context || !this.browser) return { videoPath: null };

    const video = this.page.video();
    await this.context.close();
    const videoPath = video ? await video.path() : null;
    await this.browser.close();
    return { videoPath };
  }
}
