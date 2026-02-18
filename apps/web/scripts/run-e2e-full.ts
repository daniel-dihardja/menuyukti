import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

type ServiceProcess = {
  name: string;
  process: ChildProcess;
  logPath: string;
};

type SuiteResult = {
  suite: string;
  status: "passed" | "failed";
  error?: string;
};

type CoverageReport = {
  generatedAt: string;
  plannedSuites: string[];
  executedSuites: string[];
  passedSuites: string[];
  failedSuites: Array<{ suite: string; error?: string }>;
  plannedCount: number;
  executedCount: number;
  passedCount: number;
  failedCount: number;
  scenarioCoveragePct: number;
  passRatePct: number;
};

const repoRoot = path.resolve(process.cwd(), "..", "..");
const webRoot = path.resolve(repoRoot, "apps/web");
const artifactsRoot = path.resolve(webRoot, "e2e-artifacts");
const logDir = path.resolve(webRoot, "e2e-artifacts", "runner-logs");
const reportDir = path.resolve(webRoot, "e2e-artifacts", "runner-reports");

const DEFAULT_E2E_SUITES = [
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
  "test:e2e:agents:strategist",
  "test:e2e:agents:profit-intelligence",
  "test:e2e:release-gate",
];

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
    const valueRaw = line.slice(eqIndex + 1).trim();
    const value = valueRaw.replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }
  return result;
}

function applyEnvProfile() {
  const baseEnv = parseEnvFile(path.resolve(webRoot, ".env"));
  const e2eEnv = parseEnvFile(path.resolve(webRoot, ".env.e2e"));
  const merged = { ...baseEnv, ...e2eEnv };
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function assertSafeDatabaseUrl() {
  if (process.env.E2E_DB_GUARD_DISABLED === "true") {
    console.warn("[e2e:full] WARNING: E2E DB guard disabled by E2E_DB_GUARD_DISABLED=true");
    return;
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl) {
    throw new Error("DATABASE_URL is required for E2E full runner");
  }

  const forbiddenPattern = process.env.E2E_DB_FORBIDDEN_PATTERN ?? "(prod|production)";
  const forbiddenRegex = new RegExp(forbiddenPattern, "i");
  if (forbiddenRegex.test(dbUrl)) {
    throw new Error(
      `Blocked by E2E DB guard: DATABASE_URL matches forbidden pattern "${forbiddenPattern}".`,
    );
  }

  const requiredPattern = process.env.E2E_DB_REQUIRED_PATTERN;
  if (requiredPattern) {
    const requiredRegex = new RegExp(requiredPattern, "i");
    if (!requiredRegex.test(dbUrl)) {
      throw new Error(
        `Blocked by E2E DB guard: DATABASE_URL does not match required pattern "${requiredPattern}".`,
      );
    }
  }
}

function spawnLoggedProcess(
  name: string,
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): ServiceProcess {
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.resolve(logDir, `${name}.log`);
  const stream = fs.createWriteStream(logPath, { flags: "w" });
  stream.write(`[${new Date().toISOString()}] starting: ${command} ${args.join(" ")}\n`);

  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.pipe(stream);
  child.stderr?.pipe(stream);
  child.on("exit", (code, signal) => {
    stream.write(`[${new Date().toISOString()}] exited: code=${code ?? "null"} signal=${signal ?? "null"}\n`);
    stream.end();
  });

  return { name, process: child, logPath };
}

async function runCommand(
  name: string,
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
) {
  console.log(`[e2e:full] ${name}: ${command} ${args.join(" ")}`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${name} failed with exit code ${code ?? "null"}`));
      }
    });
    child.on("error", reject);
  });
}

async function waitForHttpReady(name: string, url: string, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`[e2e:full] ${name} ready: ${url}`);
        return;
      }
    } catch {
      // no-op; keep polling
    }
    await sleep(1_000);
  }
  throw new Error(`Timeout waiting for ${name}: ${url}`);
}

function getSuites(): string[] {
  const fromEnv = process.env.E2E_SUITE_LIST?.trim();
  if (!fromEnv) return DEFAULT_E2E_SUITES;
  return fromEnv
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinUrl(base: string, suffix: string): string {
  return `${base.replace(/\/+$/g, "")}${suffix}`;
}

function resetArtifactsDirectory() {
  fs.rmSync(artifactsRoot, { recursive: true, force: true });
  fs.mkdirSync(artifactsRoot, { recursive: true });
}

function keepOnlyCoverageReports() {
  if (!fs.existsSync(artifactsRoot)) return;
  const entries = fs.readdirSync(artifactsRoot);
  for (const entry of entries) {
    if (entry === "runner-reports") continue;
    fs.rmSync(path.resolve(artifactsRoot, entry), { recursive: true, force: true });
  }
}

function isReportOnlyEnabled(): boolean {
  return process.env.E2E_REPORT_ONLY !== "0";
}

async function stopService(service: ServiceProcess) {
  if (service.process.exitCode !== null) return;
  service.process.kill("SIGTERM");
  await sleep(1_000);
  if (service.process.exitCode === null) {
    service.process.kill("SIGKILL");
  }
}

async function run() {
  applyEnvProfile();
  assertSafeDatabaseUrl();

  const env = {
    ...process.env,
    UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? "/tmp/uv-cache",
  };

  resetArtifactsDirectory();
  fs.mkdirSync(logDir, { recursive: true });
  console.log(`[e2e:full] logs: ${logDir}`);
  console.log(`[e2e:full] using DATABASE_URL host guard with pattern: ${process.env.E2E_DB_FORBIDDEN_PATTERN ?? "(prod|production)"}`);

  const services: ServiceProcess[] = [];
  let resetAfterRunFailed = false;
  const suiteResults: SuiteResult[] = [];
  const plannedSuites = [...DEFAULT_E2E_SUITES];

  try {
    services.push(
      spawnLoggedProcess(
        "analytics",
        "uv",
        ["run", "--project", "apps/analytics", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        repoRoot,
        env,
      ),
    );
    services.push(
      spawnLoggedProcess(
        "agents",
        "uv",
        [
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
        repoRoot,
        env,
      ),
    );
    services.push(
      spawnLoggedProcess(
        "web",
        "pnpm",
        ["-C", "apps/web", "exec", "next", "dev", "--turbopack", "--hostname", "127.0.0.1", "--port", "3000"],
        repoRoot,
        env,
      ),
    );

    await waitForHttpReady(
      "analytics",
      joinUrl(process.env.ANALYTICS_API_URL ?? "http://127.0.0.1:8000", "/docs"),
    );
    await waitForHttpReady(
      "agents",
      joinUrl(process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001", "/docs"),
    );
    await waitForHttpReady("web", process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000");

    console.log("[e2e:full] running DB lifecycle (pre-test)");
    await runCommand("db:reset", "pnpm", ["-C", "apps/web", "run", "db:reset"], repoRoot, env);
    await runCommand("db:gen", "pnpm", ["-C", "apps/web", "run", "db:gen"], repoRoot, env);
    await runCommand("db:init", "pnpm", ["-C", "apps/web", "run", "db:init"], repoRoot, env);
    await runCommand("db:seed", "pnpm", ["-C", "apps/web", "run", "db:seed"], repoRoot, env);
    await runCommand("db:seed:smoke", "pnpm", ["-C", "apps/web", "run", "db:seed:smoke"], repoRoot, env);

    const suites = getSuites();
    console.log(`[e2e:full] running suites (${suites.length}): ${suites.join(", ")}`);
    for (const suite of suites) {
      try {
        await runCommand(suite, "pnpm", ["-C", "apps/web", "run", suite], repoRoot, env);
        suiteResults.push({ suite, status: "passed" });
      } catch (error) {
        suiteResults.push({
          suite,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`[e2e:full] suite failed but continuing: ${suite}`);
      }
    }

    const failedCount = suiteResults.filter((item) => item.status === "failed").length;
    if (failedCount === 0) {
      console.log("[e2e:full] all suites passed");
    } else {
      console.error(`[e2e:full] suites completed with failures: ${failedCount}/${suiteResults.length}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("[e2e:full] failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      console.log("[e2e:full] running DB cleanup reset (post-test)");
      await runCommand("db:reset (post)", "pnpm", ["-C", "apps/web", "run", "db:reset"], repoRoot, env);
    } catch (error) {
      resetAfterRunFailed = true;
      console.error("[e2e:full] post-run db:reset failed:", error);
      process.exitCode = process.exitCode || 1;
    }

    for (const service of services.reverse()) {
      await stopService(service);
      console.log(`[e2e:full] stopped ${service.name} (log: ${service.logPath})`);
    }

    if (resetAfterRunFailed) {
      console.error("[e2e:full] run ended with DB reset failure. Check logs and DB state before next run.");
    }

    const report: CoverageReport = {
      generatedAt: new Date().toISOString(),
      plannedSuites,
      executedSuites: suiteResults.map((item) => item.suite),
      passedSuites: suiteResults.filter((item) => item.status === "passed").map((item) => item.suite),
      failedSuites: suiteResults
        .filter((item) => item.status === "failed")
        .map((item) => ({ suite: item.suite, error: item.error })),
      plannedCount: plannedSuites.length,
      executedCount: suiteResults.length,
      passedCount: suiteResults.filter((item) => item.status === "passed").length,
      failedCount: suiteResults.filter((item) => item.status === "failed").length,
      scenarioCoveragePct:
        plannedSuites.length === 0 ? 0 : Number(((suiteResults.length / plannedSuites.length) * 100).toFixed(2)),
      passRatePct:
        suiteResults.length === 0
          ? 0
          : Number(
              (
                (suiteResults.filter((item) => item.status === "passed").length / suiteResults.length) *
                100
              ).toFixed(2),
            ),
    };

    fs.mkdirSync(reportDir, { recursive: true });
    const timestamp = report.generatedAt.replace(/[:.]/g, "-");
    const reportPath = path.resolve(reportDir, `coverage-${timestamp}.json`);
    const latestPath = path.resolve(reportDir, "coverage-latest.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    fs.writeFileSync(latestPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log("[e2e:full] coverage summary:");
    console.log(`  planned: ${report.plannedCount}`);
    console.log(`  executed: ${report.executedCount}`);
    console.log(`  passed: ${report.passedCount}`);
    console.log(`  failed: ${report.failedCount}`);
    console.log(`  scenario coverage: ${report.scenarioCoveragePct}%`);
    console.log(`  pass rate: ${report.passRatePct}%`);
    console.log(`  report: ${reportPath}`);
    console.log(`  latest: ${latestPath}`);
    if (report.failedCount > 0) {
      console.error("[e2e:full] failed suites:");
      for (const failed of report.failedSuites) {
        console.error(`  - ${failed.suite}: ${failed.error ?? "unknown error"}`);
      }
    }
    if (isReportOnlyEnabled()) {
      keepOnlyCoverageReports();
      console.log("[e2e:full] report-only mode active: removed screenshots/videos/logs; kept runner-reports only.");
    }
  }
}

run().catch((error) => {
  console.error("[e2e:full] unhandled fatal error:", error);
  process.exit(1);
});
