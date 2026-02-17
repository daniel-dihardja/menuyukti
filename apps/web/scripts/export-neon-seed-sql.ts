import fs from "node:fs";
import path from "node:path";
import { SEED_TABLES, type SeedTable } from "../prisma/seed/seed-tables";
import { prisma } from "../lib/prisma/client";

const OUTPUT_SQL_PATH = path.resolve(process.cwd(), "prisma/seed/export/current_seed.sql");

function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, "\"\"")}"`;
}

function quoteLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return `${value}::bigint`;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof String) return `'${value.toString().replace(/'/g, "''")}'`;
  if (value instanceof Number) {
    const numberValue = Number(value.valueOf());
    return Number.isFinite(numberValue) ? String(numberValue) : "NULL";
  }
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  if (Buffer.isBuffer(value)) return `'\\\\x${value.toString("hex")}'::bytea`;
  if (
    typeof value === "object" &&
    value !== null &&
    // Prisma Decimal (decimal.js) instances
    ((value as { constructor?: { name?: string } }).constructor?.name ?? "").startsWith("Decimal") &&
    typeof (value as { toString: () => string }).toString === "function"
  ) {
    return `'${(value as { toString: () => string }).toString().replace(/'/g, "''")}'::numeric`;
  }
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function tableExists(table: SeedTable): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ regclass: string | null }>>`
    SELECT to_regclass(${`${table.schema}.${table.table}`})::text AS regclass
  `;
  return rows[0]?.regclass != null;
}

async function getColumns(table: SeedTable): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name::text AS column_name
    FROM information_schema.columns
    WHERE table_schema = ${table.schema}
      AND table_name = ${table.table}
    ORDER BY ordinal_position
  `;
  return rows.map((row) => row.column_name);
}

async function getPrimaryKeyColumns(table: SeedTable): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ attname: string }>>`
    SELECT attribute.attname::text AS attname
    FROM pg_index idx
    JOIN pg_class cls
      ON cls.oid = idx.indrelid
    JOIN pg_namespace ns
      ON ns.oid = cls.relnamespace
    JOIN unnest(idx.indkey) WITH ORDINALITY AS ind(attnum, ordinality)
      ON true
    JOIN pg_attribute attribute
      ON attribute.attrelid = cls.oid
     AND attribute.attnum = ind.attnum
    WHERE idx.indisprimary = true
      AND ns.nspname = ${table.schema}
      AND cls.relname = ${table.table}
    ORDER BY ind.ordinality
  `;
  return rows.map((row) => row.attname);
}

function buildSelectSql(table: SeedTable, columns: string[], orderColumns: string[]): string {
  const selectColumns = columns.map(quoteIdent).join(", ");
  const orderBy = orderColumns.map(quoteIdent).join(", ");
  return `SELECT ${selectColumns} FROM ${quoteIdent(table.schema)}.${quoteIdent(table.table)} ORDER BY ${orderBy}`;
}

async function exportTable(table: SeedTable): Promise<{ sql: string[]; count: number }> {
  const columns = await getColumns(table);
  if (columns.length === 0) return { sql: [], count: 0 };

  const primaryKeyColumns = await getPrimaryKeyColumns(table);
  const orderColumns = primaryKeyColumns.length > 0 ? primaryKeyColumns : columns;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    buildSelectSql(table, columns, orderColumns),
  );

  const qualifiedTable = `${quoteIdent(table.schema)}.${quoteIdent(table.table)}`;
  const insertHead = `INSERT INTO ${qualifiedTable} (${columns.map(quoteIdent).join(", ")}) VALUES`;
  const inserts = rows.map((row) => {
    const values = columns.map((column) => quoteLiteral(row[column])).join(", ");
    return `${insertHead} (${values});`;
  });

  return { sql: inserts, count: rows.length };
}

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("[seed:export] DATABASE_URL is not set.");
    process.exit(1);
  }

  const lines: string[] = [];
  let exportedRows = 0;

  try {
    const generatedAt = new Date().toISOString();
    lines.push(`-- SQL seed export generated at ${generatedAt}`);
    lines.push("-- Source: current DATABASE_URL");
    lines.push("");

    for (const table of SEED_TABLES) {
      const exists = await tableExists(table);
      if (!exists) {
        lines.push(`-- skipped missing table: ${table.schema}.${table.table}`);
        continue;
      }

      const { sql, count } = await exportTable(table);
      exportedRows += count;
      lines.push(`-- table: ${table.schema}.${table.table} (${count} rows)`);
      lines.push(...sql);
      lines.push("");
    }
  } finally {
    await prisma.$disconnect();
  }

  fs.mkdirSync(path.dirname(OUTPUT_SQL_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_SQL_PATH, `${lines.join("\n").trim()}\n`, "utf8");
  console.log(`[seed:export] Wrote ${exportedRows} rows to ${OUTPUT_SQL_PATH}`);
}

run().catch((error) => {
  console.error("[seed:export] Failed to export SQL seed:", error);
  process.exit(1);
});
