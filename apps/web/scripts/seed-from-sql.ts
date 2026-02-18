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

async function backfillAgentOutputCompatInSeed() {
  const compatColumns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `
    SELECT column_name::text AS column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_outputs'
      AND column_name IN ('contract_version', 'run_status', 'output_envelope_json')
    `,
  );
  const columnSet = new Set(compatColumns.map((row) => row.column_name));
  if (
    !columnSet.has("contract_version") ||
    !columnSet.has("run_status") ||
    !columnSet.has("output_envelope_json")
  ) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    UPDATE "public"."agent_outputs"
    SET
      "contract_version" = COALESCE(NULLIF("contract_version", ''), 'v1'),
      "run_status" = COALESCE(NULLIF("run_status", ''), CASE WHEN "outputs" IS NULL THEN 'failed' ELSE 'succeeded' END),
      "output_envelope_json" = COALESCE(
        "output_envelope_json",
        jsonb_build_object(
          'contractVersion', 'v1',
          'run', jsonb_build_object(
            'status', COALESCE(NULLIF("run_status", ''), CASE WHEN "outputs" IS NULL THEN 'failed' ELSE 'succeeded' END)
          ),
          'outputs', "outputs"
        )
      )
    WHERE "contract_version" IS NULL
       OR "contract_version" = ''
       OR "run_status" IS NULL
       OR "run_status" = ''
       OR "output_envelope_json" IS NULL
  `);
}

async function syncSerialSequences() {
  for (const table of SEED_TABLES) {
    const qualifiedTable = qualifyTable(table.schema, table.table);
    const schemaTableLiteral = `${table.schema}.${table.table}`.replace(/'/g, "''");
    const idColumnRows = await prisma.$queryRawUnsafe<Array<{ data_type: string }>>(
      `
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = '${table.schema.replace(/'/g, "''")}'
        AND table_name = '${table.table.replace(/'/g, "''")}'
        AND column_name = 'id'
      LIMIT 1
      `,
    );
    const idDataType = idColumnRows[0]?.data_type;
    if (!idDataType || !["smallint", "integer", "bigint"].includes(idDataType)) {
      continue;
    }

    const sequenceRows = await prisma.$queryRawUnsafe<
      Array<{ sequence_name: string | null; max_id: string | number | null }>
    >(
      `
      SELECT
        pg_get_serial_sequence('${schemaTableLiteral}', 'id') AS sequence_name,
        (SELECT MAX(id)::BIGINT FROM ${qualifiedTable}) AS max_id
      `,
    );

    const sequenceName = sequenceRows[0]?.sequence_name;
    const maxId = Number(sequenceRows[0]?.max_id ?? 0);
    if (!sequenceName) continue;

    if (Number.isFinite(maxId) && maxId > 0) {
      await prisma.$executeRawUnsafe(
        `SELECT setval('${sequenceName.replace(/'/g, "''")}', ${maxId}, true)`,
      );
    } else {
      await prisma.$executeRawUnsafe(
        `SELECT setval('${sequenceName.replace(/'/g, "''")}', 1, false)`,
      );
    }
  }
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

    await syncSerialSequences();
    await backfillAgentOutputCompatInSeed();
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
