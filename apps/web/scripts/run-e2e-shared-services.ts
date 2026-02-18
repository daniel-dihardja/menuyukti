import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

type ServiceName = "web" | "analytics" | "agents";

type ServiceProcess = {
  name: ServiceName;
  process: ChildProcess;
  logPath: string;
};

const repoRoot = path.resolve(process.cwd(), "..", "..");
const webRoot = path.resolve(repoRoot, "apps/web");
const logDir = path.resolve(webRoot, "e2e-artifacts", "shared-service-logs");

const DEFAULT_SUITES = [
  "test:e2e:sales",
  "test:e2e:matrix",
  "test:e2e:pairs",
  "test:e2e:pairs:pair-type",
  "test:e2e:heatmap",
  "test:e2e:cogs",
  "test:e2e:scheduler",
  "test:e2e:scheduler:post-generation",
  "test:e2e:attribution",
  "test:e2e:agents:legacy-decommission",
  "test:e2e:agents:tool-contract-policy",
  "test:e2e:agents:card-standard",
  "test:e2e:agents:contract-panels",
  "test:e2e:agents:sample-context",
  "test:e2e:agents:selected-context",
  "test:e2e:agents:output-trust-panel",
  "test:e2e:agents:run-history",
  "test:e2e:agents:run-comparison",
  "test:e2e:agents:strategist",
  "test:e2e:agents:profit-intelligence",
  "test:e2e:agents:consensus",
  "test:e2e:agents:simulation",
  "test:e2e:agents:memory",
  "test:e2e:agents:release-gate",
  "test:e2e:agents:learning",
  "test:e2e:agents:reranking",
  "test:e2e:agents:learning-release-loop",
  "test:e2e:agents:studio-overview-sandbox",
  "test:e2e:api:contracts",
  "test:e2e:release-gate",
] as const;

const SERVICES_BY_SUITE: Record<string, ServiceName[]> = {
  "test:e2e:seed": [],
  "test:e2e:sales": ["web", "analytics"],
  "test:e2e:matrix": ["web", "analytics"],
  "test:e2e:pairs": ["web", "analytics"],
  "test:e2e:pairs:pair-type": ["web", "analytics"],
  "test:e2e:heatmap": ["web", "analytics"],
  "test:e2e:cogs": ["web", "analytics"],
  "test:e2e:scheduler": ["web", "analytics"],
  "test:e2e:scheduler:post-generation": ["web", "analytics"],
  "test:e2e:attribution": ["web", "analytics"],
  "test:e2e:agents:legacy-decommission": ["web"],
  "test:e2e:agents:tool-contract-policy": ["agents"],
  "test:e2e:agents:card-standard": ["web"],
  "test:e2e:agents:contract-panels": ["web"],
  "test:e2e:agents:sample-context": ["web", "agents"],
  "test:e2e:agents:selected-context": ["web", "agents"],
  "test:e2e:agents:output-trust-panel": ["web", "agents"],
  "test:e2e:agents:run-history": ["web", "agents"],
  "test:e2e:agents:run-comparison": ["web", "agents"],
  "test:e2e:agents:strategist": ["web", "agents"],
  "test:e2e:agents:profit-intelligence": ["web", "agents"],
  "test:e2e:agents:consensus": ["web", "agents"],
  "test:e2e:agents:simulation": ["web", "agents"],
  "test:e2e:agents:memory": ["web", "agents"],
  "test:e2e:agents:release-gate": ["web", "agents"],
  "test:e2e:agents:learning": ["web", "agents"],
  "test:e2e:agents:reranking": ["web", "agents"],
  "test:e2e:agents:learning-release-loop": ["web", "agents"],
  "test:e2e:agents:studio-overview-sandbox": ["web", "agents"],
  "test:e2e:api:contracts": ["web", "analytics", "agents"],
  "test:e2e:release-gate": ["web", "analytics", "agents"],
};

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const result: Record<string, string> = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/g);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }
  return result;
}

function applyEnvProfile() {
  const baseEnv = parseEnvFile(path.resolve(webRoot, ".env"));
  const e2eEnv = parseEnvFile(path.resolve(webRoot, ".env.e2e"));
  const merged = { ...baseEnv, ...e2eEnv };
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function getSuitesFromInput(): string[] {
  const args = process.argv.slice(2).map((item) => item.trim()).filter(Boolean);
  if (args.length > 0) return args;
  const fromEnv = process.env.E2E_SUITE_LIST?.split(",").map((item) => item.trim()).filter(Boolean);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return [...DEFAULT_SUITES];
}

function requiredServicesForSuites(suites: string[]): ServiceName[] {
  const set = new Set<ServiceName>();
  for (const suite of suites) {
    const deps = SERVICES_BY_SUITE[suite] ?? ["web", "analytics", "agents"];
    for (const dep of deps) set.add(dep);
  }
  return Array.from(set);
}

async function runCommand(name: string, args: string[], cwd: string, env: NodeJS.ProcessEnv) {
  console.log(`[e2e:shared] ${name}: pnpm ${args.join(" ")}`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn("pnpm", args, { cwd, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} failed with exit code ${code ?? "null"}`));
    });
  });
}

async function isUrlReady(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForHttpReady(name: string, url: string, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isUrlReady(url)) return;
    await sleep(1_000);
  }
  throw new Error(`[e2e:shared] timeout waiting for ${name}: ${url}`);
}

function spawnLoggedService(
  name: ServiceName,
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): ServiceProcess {
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.resolve(logDir, `${name}.log`);
  const stream = fs.createWriteStream(logPath, { flags: "w" });
  stream.write(`[${new Date().toISOString()}] starting: ${command} ${args.join(" ")}\n`);

  const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout?.pipe(stream);
  child.stderr?.pipe(stream);
  child.on("exit", (code, signal) => {
    stream.write(`[${new Date().toISOString()}] exited: code=${code ?? "null"} signal=${signal ?? "null"}\n`);
    stream.end();
  });

  return { name, process: child, logPath };
}

async function stopService(service: ServiceProcess) {
  if (service.process.exitCode !== null) return;
  service.process.kill("SIGTERM");
  await sleep(1_000);
  if (service.process.exitCode === null) service.process.kill("SIGKILL");
}

async function ensureServices(services: ServiceName[], env: NodeJS.ProcessEnv): Promise<ServiceProcess[]> {
  const started: ServiceProcess[] = [];
  const readiness: Record<ServiceName, string> = {
    web: `${(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/g, "")}/api/locations`,
    analytics: `${(process.env.ANALYTICS_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/g, "")}/docs`,
    agents: `${(process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001").replace(/\/+$/g, "")}/docs`,
  };

  for (const service of services) {
    const url = readiness[service];
    if (await isUrlReady(url)) {
      console.log(`[e2e:shared] using existing ${service}: ${url}`);
      continue;
    }

    let proc: ServiceProcess;
    if (service === "analytics") {
      proc = spawnLoggedService(
        "analytics",
        "uv",
        ["run", "--project", "apps/analytics", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        repoRoot,
        env,
      );
    } else if (service === "agents") {
      proc = spawnLoggedService(
        "agents",
        "uv",
        ["run", "--project", "apps/agents", "uvicorn", "agent.api:app", "--app-dir", "apps/agents/src", "--host", "127.0.0.1", "--port", "8001"],
        repoRoot,
        env,
      );
    } else {
      proc = spawnLoggedService(
        "web",
        "pnpm",
        ["-C", "apps/web", "exec", "next", "dev", "--turbopack", "--hostname", "127.0.0.1", "--port", "3000"],
        repoRoot,
        env,
      );
    }
    started.push(proc);
    await waitForHttpReady(service, url);
    console.log(`[e2e:shared] started ${service}: ${url}`);
  }

  return started;
}

async function run() {
  applyEnvProfile();
  const suites = getSuitesFromInput();
  const required = requiredServicesForSuites(suites);
  const env = {
    ...process.env,
    UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? "/tmp/uv-cache",
    E2E_MANAGE_SERVICES: "0",
  };

  console.log(`[e2e:shared] suites: ${suites.join(", ")}`);
  console.log(`[e2e:shared] required services: ${required.join(", ") || "none"}`);

  const started = await ensureServices(required, env);
  const failed: Array<{ suite: string; error: string }> = [];
  try {
    for (const suite of suites) {
      try {
        await runCommand(suite, ["-C", "apps/web", "run", suite], repoRoot, env);
      } catch (error) {
        failed.push({ suite, error: error instanceof Error ? error.message : String(error) });
      }
    }
  } finally {
    for (const service of started.reverse()) {
      await stopService(service);
      console.log(`[e2e:shared] stopped ${service.name} (log: ${service.logPath})`);
    }
  }

  if (failed.length > 0) {
    console.error("[e2e:shared] failed suites:");
    for (const item of failed) {
      console.error(`- ${item.suite}: ${item.error}`);
    }
    process.exit(1);
  }

  console.log("[e2e:shared] all suites passed");
}

run().catch((error) => {
  console.error("[e2e:shared] failed:", error);
  process.exit(1);
});
