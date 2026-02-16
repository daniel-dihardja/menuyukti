export type CsvCell = string | number | boolean | null | undefined | Date;

function normalizeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function escapeCsvCell(value: string): string {
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv<T extends Record<string, CsvCell>>(
  rows: T[],
  orderedColumns: string[],
): string {
  const header = orderedColumns.join(",");
  const body = rows
    .map((row) =>
      orderedColumns
        .map((column) => escapeCsvCell(normalizeCell(row[column])))
        .join(","),
    )
    .join("\n");

  return body.length > 0 ? `${header}\n${body}` : `${header}\n`;
}
