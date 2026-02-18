import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

type AgentDefinition = {
  id: string;
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

async function waitForSampleRunResult(page: Page, agentId: string) {
  if (agentId === "marketer-strategist") {
    await page.getByText(/No actionable weekly priorities returned|#1/i).first().waitFor({ state: "visible", timeout: 45_000 });
    return;
  }
  if (agentId === "menu-profit-intelligence") {
    await page.getByText(/No actionable profitability recommendations returned|impact revenue:/i).first().waitFor({
      state: "visible",
      timeout: 45_000,
    });
    return;
  }
  if (agentId === "multi-agent-consensus") {
    await page.getByText(/Winner:|No consensus recommendations available/i).first().waitFor({ state: "visible", timeout: 45_000 });
    return;
  }
  if (agentId === "what-if-simulation") {
    await page.getByText(/Winner:|No scenarios were returned/i).first().waitFor({ state: "visible", timeout: 45_000 });
    return;
  }
  if (agentId === "agent-memory-tracker") {
    await page.getByText(/continuity:|v[0-9]+ · rec-/i).first().waitFor({ state: "visible", timeout: 45_000 });
    return;
  }
  if (agentId === "feedback-reranker") {
    await page.getByText(/policy:|No reranked recommendations|delta:/i).first().waitFor({ state: "visible", timeout: 45_000 });
    return;
  }
  if (agentId === "learning-release-loop") {
    await page.getByText(/Latest:/i).first().waitFor({ state: "visible", timeout: 45_000 });
    return;
  }
  throw new Error(`unsupported agent id in e2e mapping: ${agentId}`);
}

async function run() {
  await ensureE2eData({ testId: "agent-sample-context-runner", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const readyAgents = loadAgentDefinitions().filter((agent) => agent.status === "ready");
  assert(readyAgents.length > 0, "expected at least one ready agent");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const agent of readyAgents) {
    await page.goto(`${baseUrl}/agents/${agent.id}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Run Sample Context/i }).first().waitFor({ state: "visible", timeout: 30_000 });
    await page.getByRole("button", { name: /Run Sample Context/i }).first().click();
    await waitForSampleRunResult(page, agent.id);
  }

  await browser.close();
  console.log("[e2e] agent-sample-context-runner: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-sample-context-runner: failed", error);
  process.exit(1);
});

