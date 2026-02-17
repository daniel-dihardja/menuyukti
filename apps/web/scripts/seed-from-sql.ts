import fs from "node:fs";
import path from "node:path";
import { SEED_TABLES } from "../prisma/seed/seed-tables";
import { prisma } from "../lib/prisma/client";

const SQL_FILE_PATH = path.resolve(process.cwd(), "prisma/seed/export/current_seed.sql");

function splitStatements(sql: string): string[] {
  const withoutLineComments = sql
    .split(/\r?\n/g)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  return withoutLineComments
    .split(/;\s*(?:\r?\n|$)/g)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .map((statement) => `${statement};`);
}

function qualifyTable(schema: string, table: string): string {
  return `"${schema.replace(/"/g, "\"\"")}"."${table.replace(/"/g, "\"\"")}"`;
}

function parseInsertTarget(statement: string): string | null {
  const match = statement.match(/^INSERT\s+INTO\s+("[^"]+"\."[^"]+"|\w+\.\w+|\w+)/i);
  if (!match?.[1]) return null;
  return match[1].replace(/\s+/g, "");
}

async function run() {
  if (!fs.existsSync(SQL_FILE_PATH)) {
    console.error(`[seed] SQL seed file not found: ${SQL_FILE_PATH}`);
    console.error("[seed] Generate it first once export script is available.");
    process.exit(1);
  }

  const sql = fs.readFileSync(SQL_FILE_PATH, "utf8");
  const statements = splitStatements(sql);
  const insertCounts = new Map<string, number>();

  try {
    const truncateTargets = [...SEED_TABLES]
      .reverse()
      .map((table) => qualifyTable(table.schema, table.table))
      .join(", ");

    await prisma.$executeRawUnsafe("BEGIN");
    if (truncateTargets.length > 0) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${truncateTargets} RESTART IDENTITY CASCADE;`);
    }

    for (const [index, statement] of statements.entries()) {
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (error) {
        console.error(`[seed] Statement failed at index ${index + 1}: ${statement.slice(0, 200)}`);
        throw error;
      }
      const target = parseInsertTarget(statement);
      if (target) {
        insertCounts.set(target, (insertCounts.get(target) ?? 0) + 1);
      }
    }

    await prisma.$executeRawUnsafe("COMMIT");
    if (statements.length === 0) {
      console.log(`[seed] No statements found in ${SQL_FILE_PATH}. Applied truncate only.`);
      return;
    }

    console.log(`[seed] Executed ${statements.length} SQL statements from ${SQL_FILE_PATH}.`);
    if (insertCounts.size > 0) {
      console.log("[seed] Insert summary by table:");
      for (const [table, count] of insertCounts.entries()) {
        console.log(`  - ${table}: ${count} insert statements`);
      }
    }
  } catch (error) {
    await prisma.$executeRawUnsafe("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error("[seed] Failed to execute SQL seed:", error);
  process.exit(1);
});
