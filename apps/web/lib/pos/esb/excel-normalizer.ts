import { OrderItem } from "@/lib/domain/sales.types";

export type NormalizedValue = string | number | Date | null;
export type NormalizedRow = Record<string, NormalizedValue>;

/**
 * Convert Excel serial date → JS Date
 */
function excelSerialToDate(serial: number): Date {
  const unixTime = (serial - 25569) * 86400 * 1000;
  return new Date(unixTime);
}

/**
 * SAFER Excel serial date detection
 * - Only accept dates from 2000–2100
 * - Strongly reduces false positives (prices, revenues, IDs, etc.)
 */
function isExcelDateSerial(num: number): boolean {
  if (num < 20000 || num > 50000) return false;

  const d = excelSerialToDate(num);
  const year = d.getUTCFullYear();

  return year >= 2000 && year <= 2100;
}

/**
 * Normalize individual cell values
 * - empty-like → null
 * - preserve leading-zero numeric strings
 * - convert Excel dates
 * - convert safe numbers
 */
function convertValue(value: string | null | undefined): NormalizedValue {
  if (value == null) return null;

  const v = value.trim();
  if (v === "" || v === "-" || v.toLowerCase() === "null") return null;

  // Preserve values like "000123"
  if (/^0+\d+$/.test(v)) {
    return v;
  }

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
 * Normalize raw Excel rows
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

/**
 * Safely extract a Date field
 */
function pickDate(row: NormalizedRow, key: string): Date | null {
  const val = row[key];
  return val instanceof Date ? val : null;
}

/**
 * Map a normalized row into an OrderItem
 */
export function mapToOrderItem(row: NormalizedRow): OrderItem {
  const datetime =
    pickDate(row, "SalesDateIn") ??
    pickDate(row, "OrderTime") ??
    pickDate(row, "SalesDate");

  if (!datetime) {
    throw new Error(
      `Missing datetime for row with BillNumber=${row.BillNumber}`
    );
  }

  return {
    billNumber: String(row.BillNumber),
    salesNumber: String(row.SalesNumber),
    menuCode: row.MenuCode ? String(row.MenuCode) : undefined,
    menuName: String(row.Menu),
    category: String(row.MenuCategory),
    subcategory: row.MenuCategoryDetail
      ? String(row.MenuCategoryDetail)
      : undefined,
    qty: Number(row.Qty),
    price: Number(row.Price),
    revenue: Number(row.Total ?? row.Subtotal),
    discount: row.Discount != null ? Number(row.Discount) : undefined,
    datetime,
    branch: String(row.Branch),
  };
}

/**
 * Normalize and map all rows
 */
export function normalizeAndMapSalesRows(
  rows: Record<string, string>[]
): OrderItem[] {
  return normalizeExcelRows(rows).map(mapToOrderItem);
}
