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

function loadReadyAgents(): AgentDefinition[] {
  const raw = fs.readFileSync(path.resolve(process.cwd(), "lib/agents.json"), "utf8");
  const parsed = JSON.parse(raw) as AgentDefinition[];
  return parsed.filter((agent) => agent.status === "ready");
}

function runButtonNameForAgent(agentId: string): RegExp {
  if (agentId === "marketer-strategist") return /Generate Weekly Plan/i;
  if (agentId === "menu-profit-intelligence") return /Generate Action Board/i;
  if (agentId === "multi-agent-consensus") return /Run Consensus/i;
  if (agentId === "what-if-simulation") return /Run What-If/i;
  if (agentId === "agent-memory-tracker") return /Record Accepted/i;
  if (agentId === "feedback-reranker") return /Run Re-ranking/i;
  if (agentId === "learning-release-loop") return /Run Release Decision/i;
  throw new Error(`unsupported agent id for selected-context run: ${agentId}`);
}

async function waitForRunResult(page: Page, agentId: string) {
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
  throw new Error(`unsupported agent id in result mapping: ${agentId}`);
}

async function selectContext(page: Page) {
  await page.locator("#agent-location-select").click();
  await page.locator('[role="option"]').first().click();
  await page.locator("#agent-analytics-select").click();
  await page.locator('[role="option"]').first().click();
}

async function run() {
  await ensureE2eData({ testId: "agent-selected-context-runner", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const agents = loadReadyAgents();
  assert(agents.length > 0, "expected at least one ready agent");

  const browser = await chromium.launch({ headless: true });

  for (const agent of agents) {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/agents/${agent.id}`, { waitUntil: "domcontentloaded" });

    const runButton = page.getByRole("button", { name: runButtonNameForAgent(agent.id) }).first();
    await runButton.waitFor({ state: "visible", timeout: 30_000 });
    await page.locator("[data-selected-context-state]").first().waitFor({ state: "visible", timeout: 30_000 });

    const initialState = await page.locator("[data-selected-context-state]").first().innerText();
    assert(
      /selected context: (blocked|degraded)/i.test(initialState),
      `expected blocked/degraded initial selected context for ${agent.id}, got=${initialState}`,
    );
    assert(await runButton.isDisabled(), `expected run button disabled before context selection for ${agent.id}`);

    await selectContext(page);
    await page.locator('[data-selected-context-state="ready"]').first().waitFor({ state: "visible", timeout: 30_000 });

    if (agent.id === "multi-agent-consensus" || agent.id === "feedback-reranker") {
      const prime = await fetch(`${baseUrl}/api/agents/profit-intelligence?analyticsId=1`);
      assert(prime.ok, `failed to prime profit intelligence for ${agent.id}`);
    }

    await runButton.click();
    await waitForRunResult(page, agent.id);
    await page.close();
  }

  await browser.close();
  console.log("[e2e] agent-selected-context-runner: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-selected-context-runner: failed", error);
  process.exit(1);
});
