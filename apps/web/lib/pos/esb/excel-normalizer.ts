export type NormalizedValue = string | number | Date | null;

export type NormalizedRow = Record<string, NormalizedValue>;

function excelSerialToDate(serial: number): Date {
  const unixTime = (serial - 25569) * 86400 * 1000;
  return new Date(unixTime);
}

function isExcelDateSerial(num: number): boolean {
  return num > 30000 && num < 60000;
}

function convertValue(value: string | null | undefined): NormalizedValue {
  if (value === undefined || value === null) return null;

  const v = value.trim();
  if (v === "" || v === "-" || v.toLowerCase() === "null") return null;

  const num = Number(v);
  if (!isNaN(num)) {
    if (isExcelDateSerial(num)) {
      return excelSerialToDate(num);
    }
    return num;
  }

  return v;
}

/**
 * Normalizes raw Excel rows by:
 * - cleaning and compacting column names (removes whitespace),
 * - trimming cell values,
 * - converting numeric strings into numbers,
 * - converting Excel date-serial values into `Date` objects,
 * - converting empty-like values ("" | "-" | "null") into `null`.
 *
 * @param rows - The raw rows extracted from the Excel sheet.
 *               Keys are the original header names, values are raw string cell values.
 *
 * @returns An array of normalized rows, where:
 *          - keys are cleaned (no whitespace),
 *          - values are typed (`string`, `number`, `Date`, or `null`).
 */
export function normalizeExcelRows(
  rows: Record<string, string>[]
): NormalizedRow[] {
  return rows.map((row) => {
    const normalized: NormalizedRow = {};

    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.replace(/\s+/g, "").trim();
      normalized[cleanKey] = convertValue(value);
    }

    return normalized;
  });
}
