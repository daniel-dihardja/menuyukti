import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

type ManagedServiceName = "web" | "analytics" | "agents";

type ManagedService = {
  name: ManagedServiceName;
  process: ChildProcess;
  logPath: string;
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

function applyEnvProfile(webRoot: string) {
  const baseEnv = parseEnvFile(path.resolve(webRoot, ".env"));
  const e2eEnv = parseEnvFile(path.resolve(webRoot, ".env.e2e"));
  const merged = { ...baseEnv, ...e2eEnv };
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseRequiredServices(): ManagedServiceName[] {
  const raw = (process.env.E2E_REQUIRED_SERVICES ?? "web,analytics,agents")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  const result: ManagedServiceName[] = [];
  for (const token of raw) {
    if (token === "none") return [];
    if ((token === "web" || token === "analytics" || token === "agents") && !result.includes(token)) {
      result.push(token);
    }
  }
  return result;
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
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isUrlReady(url)) return;
    await sleep(1_000);
  }
  throw new Error(`[e2e:suite] timeout waiting for ${name} at ${url}`);
}

function spawnLoggedProcess(params: {
  name: ManagedServiceName;
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  logDir: string;
}): ManagedService {
  fs.mkdirSync(params.logDir, { recursive: true });
  const logPath = path.resolve(params.logDir, `${params.name}.log`);
  const stream = fs.createWriteStream(logPath, { flags: "w" });
  stream.write(`[${new Date().toISOString()}] starting: ${params.command} ${params.args.join(" ")}\n`);

  const child = spawn(params.command, params.args, {
    cwd: params.cwd,
    env: params.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.pipe(stream);
  child.stderr?.pipe(stream);
  child.on("exit", (code, signal) => {
    stream.write(`[${new Date().toISOString()}] exited: code=${code ?? "null"} signal=${signal ?? "null"}\n`);
    stream.end();
  });

  return {
    name: params.name,
    process: child,
    logPath,
  };
}

async function stopService(service: ManagedService) {
  if (service.process.exitCode !== null) return;
  service.process.kill("SIGTERM");
  await sleep(1_000);
  if (service.process.exitCode === null) {
    service.process.kill("SIGKILL");
  }
}

async function runSuite(filePath: string, cwd: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("node", ["--import", "tsx", filePath], {
      cwd,
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`[e2e:suite] failed: ${path.basename(filePath)} (exit ${code ?? "null"})`));
    });
  });
}

async function run() {
  const suitePathArg = process.argv[2];
  if (!suitePathArg) {
    throw new Error("Usage: node --import tsx scripts/run-e2e-suite.ts <relative-e2e-file>");
  }

  const webRoot = process.cwd();
  const repoRoot = path.resolve(webRoot, "..", "..");
  const suitePath = path.resolve(webRoot, suitePathArg);
  if (!fs.existsSync(suitePath)) {
    throw new Error(`[e2e:suite] file not found: ${suitePath}`);
  }

  applyEnvProfile(webRoot);
  const requiredServices = process.env.E2E_MANAGE_SERVICES === "0" ? [] : parseRequiredServices();
  const logDir = path.resolve(webRoot, "e2e-artifacts", "service-logs");
  const started: ManagedService[] = [];

  const env = {
    ...process.env,
    UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? "/tmp/uv-cache",
  };

  const readinessByService: Record<ManagedServiceName, string> = {
    web: `${(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/g, "")}/api/locations`,
    analytics: `${(process.env.ANALYTICS_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/g, "")}/docs`,
    agents: `${(process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001").replace(/\/+$/g, "")}/docs`,
  };

  try {
    for (const service of requiredServices) {
      const readinessUrl = readinessByService[service];
      if (await isUrlReady(readinessUrl)) {
        console.log(`[e2e:suite] using existing ${service} service (${readinessUrl})`);
        continue;
      }

      let managed: ManagedService;
      if (service === "analytics") {
        managed = spawnLoggedProcess({
          name: "analytics",
          command: "uv",
          args: ["run", "--project", "apps/analytics", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
          cwd: repoRoot,
          env,
          logDir,
        });
      } else if (service === "agents") {
        managed = spawnLoggedProcess({
          name: "agents",
          command: "uv",
          args: [
            "run",
            "--project",
            "apps/agents",
            "uvicorn",
            "agent.api:app",
            "--app-dir",
            "apps/agents/src",
            "--host",
            "127.0.0.1",
            "--port",
            "8001",
          ],
          cwd: repoRoot,
          env,
          logDir,
        });
      } else {
        managed = spawnLoggedProcess({
          name: "web",
          command: "pnpm",
          args: ["-C", "apps/web", "exec", "next", "dev", "--turbopack", "--hostname", "127.0.0.1", "--port", "3000"],
          cwd: repoRoot,
          env,
          logDir,
        });
      }
      started.push(managed);
      await waitForHttpReady(service, readinessUrl);
      console.log(`[e2e:suite] started ${service} (${readinessUrl})`);
    }

    await runSuite(suitePath, webRoot);
  } finally {
    for (const service of started.reverse()) {
      await stopService(service);
      console.log(`[e2e:suite] stopped ${service.name} (log: ${service.logPath})`);
    }
  }
}

run().catch((error) => {
  console.error("[e2e:suite] failed:", error);
  process.exit(1);
});
