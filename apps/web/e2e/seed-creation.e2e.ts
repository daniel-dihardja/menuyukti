import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

type InsertKey = `${string}.${string}`;

const SQL_FILE_PATH = path.resolve(process.cwd(), "prisma/seed/export/current_seed.sql");
const ENV_PATH = path.resolve(process.cwd(), ".env");

type PrismaClientLike = {
  $queryRawUnsafe<T = unknown>(query: string): Promise<T>;
  $disconnect(): Promise<void>;
};

function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function parseInsertCounts(sql: string): Map<InsertKey, number> {
  const counts = new Map<InsertKey, number>();
  const regex = /INSERT\s+INTO\s+"?([a-zA-Z0-9_]+)"?\."?([a-zA-Z0-9_]+)"?/gi;
  let match = regex.exec(sql);
  while (match) {
    const schema = match[1];
    const table = match[2];
    if (schema && table) {
      const key = `${schema}.${table}` as InsertKey;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    match = regex.exec(sql);
  }
  return counts;
}

async function runCommand(name: string, command: string, args: string[], cwd: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`[seed-e2e] ${name} failed with exit code ${code ?? "null"}`));
      }
    });
  });
}

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

async function loadTableCount(prisma: PrismaClientLike, schema: string, table: string): Promise<number> {
  const qualified = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM ${qualified}`,
  );
  return Number(rows[0]?.count ?? 0n);
}

async function run() {
  loadEnvFile(ENV_PATH);
  const { prisma } = await import("../lib/prisma/client");

  if (!fs.existsSync(SQL_FILE_PATH)) {
    throw new Error(`[seed-e2e] SQL seed file not found: ${SQL_FILE_PATH}`);
  }

  const sql = fs.readFileSync(SQL_FILE_PATH, "utf8");
  const insertCounts = parseInsertCounts(sql);
  if (insertCounts.size === 0) {
    throw new Error(`[seed-e2e] No INSERT statements detected in ${SQL_FILE_PATH}`);
  }

  const skipSeed = process.env.E2E_SKIP_SEED_EXECUTE === "1";
  if (!skipSeed) {
    await runCommand("db:seed", "pnpm", ["run", "db:seed"], process.cwd());
  }

  try {
    for (const [key, expectedCount] of insertCounts.entries()) {
      const splitAt = key.indexOf(".");
      const schema = key.slice(0, splitAt);
      const table = key.slice(splitAt + 1);
      const actualCount = await loadTableCount(prisma, schema, table);

      if (actualCount !== expectedCount) {
        throw new Error(
          `[seed-e2e] Row count mismatch for ${key}. expected=${expectedCount} actual=${actualCount}`,
        );
      }

      console.log(`[seed-e2e] ${key} ok expected=${expectedCount} actual=${actualCount}`);
    }

    const agentOutputRows = await loadTableCount(prisma, "public", "agent_outputs");
    if (agentOutputRows > 0) {
      const invalid = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `
        SELECT COUNT(*)::bigint AS count
        FROM "public"."agent_outputs"
        WHERE "contract_version" IS NULL
           OR "contract_version" = ''
           OR "run_status" IS NULL
           OR "run_status" = ''
           OR "output_envelope_json" IS NULL
        `,
      );
      const invalidCount = Number(invalid[0]?.count ?? 0n);
      if (invalidCount > 0) {
        throw new Error(
          `[seed-e2e] agent_outputs compatibility fields invalid rows=${invalidCount}`,
        );
      }
      console.log(`[seed-e2e] agent_outputs compatibility fields ok rows=${agentOutputRows}`);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`[seed-e2e] Seed creation validation passed for ${insertCounts.size} table(s).`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
