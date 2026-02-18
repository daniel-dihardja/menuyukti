import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

type AgentDefinition = {
  id: string;
  name: string;
  status: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function loadAgentDefinitions(): AgentDefinition[] {
  const raw = fs.readFileSync(path.resolve(process.cwd(), "lib/agents.json"), "utf8");
  const parsed = JSON.parse(raw) as AgentDefinition[];
  return Array.isArray(parsed) ? parsed : [];
}

async function run() {
  await ensureE2eData({ testId: "agent-contract-panels", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const definitions = loadAgentDefinitions().filter((agent) => agent.status === "ready");
  assert(definitions.length > 0, "expected at least one ready agent");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const agent of definitions) {
    await page.goto(`${baseUrl}/agents/${agent.id}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: new RegExp(agent.name, "i") }).first().waitFor({
      state: "visible",
      timeout: 30_000,
    });

    await page.locator(`[data-agent-input-contract="${agent.id}"]`).first().waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await page.locator(`[data-agent-output-contract="${agent.id}"]`).first().waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await page.locator("[data-contract-input-version]").first().waitFor({ state: "visible", timeout: 30_000 });
    await page.locator("[data-contract-output-version]").first().waitFor({ state: "visible", timeout: 30_000 });
    await page.locator("[data-contract-prompt-version]").first().waitFor({ state: "visible", timeout: 30_000 });
    await page.locator("[data-contract-model-version]").first().waitFor({ state: "visible", timeout: 30_000 });
    await page.locator("[data-contract-input-constraints]").first().waitFor({ state: "visible", timeout: 30_000 });
    await page
      .locator("[data-contract-required-trust-fields]")
      .first()
      .waitFor({ state: "visible", timeout: 30_000 });
  }

  await browser.close();
  console.log("[e2e] agent-contract-panels: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-contract-panels: failed", error);
  process.exit(1);
});

