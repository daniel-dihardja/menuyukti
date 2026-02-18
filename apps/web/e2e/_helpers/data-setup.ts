import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export type E2eDataPolicy = "reuse" | "seed" | "reset-seed";

type EnsureE2eDataOptions = {
  testId: string;
  defaultPolicy: E2eDataPolicy;
  cwd?: string;
  runSmokeCheck?: boolean;
};

const executedPolicies = new Map<string, boolean>();

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/g);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parsePolicy(raw: string | undefined): E2eDataPolicy | null {
  if (raw === "reuse" || raw === "seed" || raw === "reset-seed") return raw;
  return null;
}

function resolvePolicy(testId: string, fallback: E2eDataPolicy): E2eDataPolicy {
  const testSpecificKey = `E2E_DATA_POLICY_${testId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const byTest = parsePolicy(process.env[testSpecificKey]);
  if (byTest) return byTest;
  const global = parsePolicy(process.env.E2E_DATA_POLICY);
  if (global) return global;
  return fallback;
}

async function runCommand(name: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("pnpm", args, {
      cwd,
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`[e2e:data] ${name} failed with exit code ${code ?? "null"}`));
    });
  });
}

export async function ensureE2eData(options: EnsureE2eDataOptions): Promise<E2eDataPolicy> {
  const cwd = options.cwd ?? process.cwd();
  loadEnvFile(path.resolve(cwd, ".env"));

  const policy = resolvePolicy(options.testId, options.defaultPolicy);
  const smoke = options.runSmokeCheck ?? true;
  const cacheKey = `${cwd}:${policy}:${smoke}`;

  if (executedPolicies.get(cacheKey)) {
    return policy;
  }

  if (policy === "seed") {
    await runCommand("db:seed", ["run", "db:seed"], cwd);
    if (smoke) await runCommand("db:seed:smoke", ["run", "db:seed:smoke"], cwd);
  } else if (policy === "reset-seed") {
    await runCommand("db:reset", ["run", "db:reset"], cwd);
    await runCommand("db:seed", ["run", "db:seed"], cwd);
    if (smoke) await runCommand("db:seed:smoke", ["run", "db:seed:smoke"], cwd);
  }

  executedPolicies.set(cacheKey, true);
  console.log(`[e2e:data] ${options.testId}: policy=${policy}`);
  return policy;
}

export async function ensureApiReachable(baseUrl: string): Promise<void> {
  try {
    await fetch(`${baseUrl.replace(/\/+$/g, "")}/api/locations`);
  } catch {
    throw new Error(
      `[e2e:data] API server is not reachable at ${baseUrl}. Start Next.js first (pnpm -C apps/web run dev).`,
    );
  }
}
