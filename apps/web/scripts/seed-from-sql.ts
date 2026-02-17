import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

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

async function run() {
  if (!fs.existsSync(SQL_FILE_PATH)) {
    console.error(`[seed] SQL seed file not found: ${SQL_FILE_PATH}`);
    console.error("[seed] Generate it first once export script is available.");
    process.exit(1);
  }

  const sql = fs.readFileSync(SQL_FILE_PATH, "utf8");
  const statements = splitStatements(sql);
  if (statements.length === 0) {
    console.log(`[seed] No statements found in ${SQL_FILE_PATH}.`);
    return;
  }

  const prisma = new PrismaClient();
  try {
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
    console.log(`[seed] Executed ${statements.length} SQL statements from ${SQL_FILE_PATH}.`);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error("[seed] Failed to execute SQL seed:", error);
  process.exit(1);
});
