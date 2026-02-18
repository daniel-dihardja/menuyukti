import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma/client";

const PACKAGE_JSON_PATH = path.resolve(process.cwd(), "package.json");
const PRISMA_CONFIG_PATH = path.resolve(process.cwd(), "prisma.config.ts");
const SQL_FILE_PATH = path.resolve(process.cwd(), "prisma/seed/export/current_seed.sql");

type InsertTarget = {
  schema: string;
  table: string;
};

function fail(message: string): never {
  throw new Error(`[seed:smoke] ${message}`);
}

function parseInsertTargets(sql: string): InsertTarget[] {
  const regex = /INSERT\s+INTO\s+"?([a-zA-Z0-9_]+)"?\."?([a-zA-Z0-9_]+)"?/gi;
  const found: InsertTarget[] = [];
  let match = regex.exec(sql);
  while (match) {
    const schema = match[1];
    const table = match[2];
    if (schema && table) {
      found.push({ schema, table });
    }
    match = regex.exec(sql);
  }
  const deduped = new Map<string, InsertTarget>();
  for (const item of found) {
    deduped.set(`${item.schema}.${item.table}`, item);
  }
  return [...deduped.values()];
}

function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, "\"\"")}"`;
}

async function validateRowCounts(targets: InsertTarget[]) {
  if (targets.length === 0) return;
  if (!process.env.DATABASE_URL) {
    console.warn("[seed:smoke] DATABASE_URL not set. Skipping row-count checks.");
    return;
  }

  try {
    for (const target of targets) {
      const qualified = `${quoteIdent(target.schema)}.${quoteIdent(target.table)}`;
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${qualified}`,
      );
      const count = Number(rows[0]?.count ?? 0n);
      if (count <= 0) {
        fail(`Expected non-zero rows after seed for ${target.schema}.${target.table}, got ${count}.`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function validateAgentOutputCompatColumns() {
  if (!process.env.DATABASE_URL) return;

  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM "public"."agent_outputs"`,
  );
  const count = Number(rows[0]?.count ?? 0n);
  if (count <= 0) return;

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
    fail(
      `Expected compatibility fields on seeded agent_outputs rows. Found ${invalidCount} rows with missing contract/run/envelope metadata.`,
    );
  }
}

async function run() {
  if (!fs.existsSync(PACKAGE_JSON_PATH)) fail("package.json not found.");
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const dbSeed = pkg.scripts?.["db:seed"] ?? "";
  if (!dbSeed.includes("prisma db seed")) {
    fail("`db:seed` script is missing or not wired to `prisma db seed`.");
  }

  if (!fs.existsSync(PRISMA_CONFIG_PATH)) fail("prisma.config.ts not found.");
  const prismaConfig = fs.readFileSync(PRISMA_CONFIG_PATH, "utf8");
  if (!/migrations\s*:\s*\{[\s\S]*seed\s*:\s*["'][^"']+["']/m.test(prismaConfig)) {
    fail("Prisma seed hook is missing in prisma.config.ts migrations.seed.");
  }

  if (!fs.existsSync(SQL_FILE_PATH)) {
    fail(`SQL seed artifact not found at ${SQL_FILE_PATH}. Run db:seed:export first.`);
  }
  const sql = fs.readFileSync(SQL_FILE_PATH, "utf8");
  if (!sql.trim()) {
    fail(`SQL seed artifact is empty: ${SQL_FILE_PATH}.`);
  }

  const targets = parseInsertTargets(sql);
  if (targets.length === 0) {
    console.warn("[seed:smoke] SQL seed artifact contains no INSERT statements.");
    console.warn("[seed:smoke] Wiring checks passed.");
    return;
  }

  await validateRowCounts(targets);
  await validateAgentOutputCompatColumns();
  console.log(`[seed:smoke] Passed wiring and data checks for ${targets.length} table(s).`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
