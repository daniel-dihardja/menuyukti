export type NormalizedRow = Record<string, string>;

export function normalizeExcelRows(
  rows: Record<string, string>[]
): NormalizedRow[] {
  return rows.map((row) => {
    const normalized: NormalizedRow = {};

    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.replace(/\s+/g, "").trim();
      normalized[cleanKey] = value.trim();
    }

    return normalized;
  });
}
