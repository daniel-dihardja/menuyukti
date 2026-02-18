import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

type AgentDefinition = {
  id: string;
  name: string;
  status: string;
  persona?: string;
  trustScope?: string;
  purpose?: string;
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
  await ensureE2eData({ testId: "agent-card-information-standard", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const definitions = loadAgentDefinitions();
  assert(definitions.length > 0, "expected at least one agent definition");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/agents`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /agents/i }).first().waitFor({ state: "visible", timeout: 30_000 });

  for (const agent of definitions) {
    const card = page.locator(`[data-agent-card="${agent.id}"]`);
    await card.first().waitFor({ state: "visible", timeout: 30_000 });

    await card.getByText(new RegExp(agent.name, "i")).first().waitFor({ state: "visible", timeout: 30_000 });
    await card.locator("[data-agent-purpose]").first().waitFor({ state: "visible", timeout: 30_000 });
    await card.locator("[data-agent-status]").first().waitFor({ state: "visible", timeout: 30_000 });
    await card.locator("[data-agent-persona]").first().waitFor({ state: "visible", timeout: 30_000 });
    await card.locator("[data-agent-trust-scope]").first().waitFor({ state: "visible", timeout: 30_000 });

    const status = (await card.locator("[data-agent-status]").first().textContent())?.trim().toLowerCase();
    assert(status === agent.status.toLowerCase(), `status mismatch for ${agent.id}`);
  }

  await browser.close();
  console.log("[e2e] agent-card-information-standard: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-card-information-standard: failed", error);
  process.exit(1);
});
