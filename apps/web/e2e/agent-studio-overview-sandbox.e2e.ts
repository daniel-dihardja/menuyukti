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

async function assertApiSandboxIsRunnable(agentId: string) {
  if (agentId === "marketer-strategist") {
    const response = await fetch(`${baseUrl}/api/agents/strategist?analyticsId=1`);
    assert(response.ok, `strategist endpoint failed status=${response.status}`);
    return;
  }
  if (agentId === "menu-profit-intelligence") {
    const response = await fetch(`${baseUrl}/api/agents/profit-intelligence?analyticsId=1`);
    assert(response.ok, `profit-intelligence endpoint failed status=${response.status}`);
    return;
  }
  if (agentId === "multi-agent-consensus") {
    const response = await fetch(`${baseUrl}/api/agents/consensus?analyticsId=1&mode=conservative`);
    assert(response.ok, `consensus endpoint failed status=${response.status}`);
    return;
  }
  if (agentId === "what-if-simulation") {
    const response = await fetch(`${baseUrl}/api/agents/simulation?analyticsId=1&mode=conservative`);
    assert(response.ok, `simulation endpoint failed status=${response.status}`);
    return;
  }
  if (agentId === "agent-memory-tracker") {
    const post = await fetch(`${baseUrl}/api/agents/memory`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        locationId: 1,
        analyticsId: 1,
        sourceAgentId: "agent-studio-overview-sandbox",
        recommendationId: `rec-overview-${Date.now()}`,
        state: "accepted",
      }),
    });
    assert(post.ok, `memory POST failed status=${post.status}`);
    const get = await fetch(`${baseUrl}/api/agents/memory?locationId=1&limit=5`);
    assert(get.ok, `memory GET failed status=${get.status}`);
    return;
  }
  if (agentId === "feedback-reranker") {
    const response = await fetch(`${baseUrl}/api/agents/profit-intelligence/reranked?analyticsId=1`);
    assert(response.ok, `reranker endpoint failed status=${response.status}`);
    return;
  }
  if (agentId === "learning-release-loop") {
    const response = await fetch(`${baseUrl}/api/agents/learning/release-loop`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        locationId: 1,
        analyticsId: 1,
        stage: "shadow",
        candidatePolicyVersion: "as12-v1",
        baselinePolicyVersion: "as11-v1",
      }),
    });
    assert(response.ok, `release-loop endpoint failed status=${response.status}`);
  }
}

async function run() {
  await ensureE2eData({ testId: "agent-studio-overview-sandbox", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const definitions = loadAgentDefinitions();
  const readyAgents = definitions.filter((agent) => agent.status === "ready");
  const draftAgents = definitions.filter((agent) => agent.status !== "ready");
  assert(readyAgents.length > 0, "expected at least one ready agent");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/agents`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /agents/i }).first().waitFor({ state: "visible", timeout: 30_000 });

  for (const agent of readyAgents) {
    await page.getByRole("link", { name: new RegExp(agent.name, "i") }).first().waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await assertApiSandboxIsRunnable(agent.id);

    await page.goto(`${baseUrl}/agents/${agent.id}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: new RegExp(agent.name, "i") }).first().waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await page.getByText(/inputs/i).first().waitFor({ state: "visible", timeout: 30_000 });
    await page.getByText(/outputs/i).first().waitFor({ state: "visible", timeout: 30_000 });

    await page.goto(`${baseUrl}/agents`, { waitUntil: "domcontentloaded" });
  }

  for (const agent of draftAgents) {
    await page.goto(`${baseUrl}/agents/${agent.id}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: new RegExp(agent.name, "i") }).first().waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await page.getByText(/coming soon/i).first().waitFor({ state: "visible", timeout: 30_000 });
  }

  await browser.close();
  console.log("[e2e] agent-studio-overview-sandbox: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-studio-overview-sandbox: failed", error);
  process.exit(1);
});
