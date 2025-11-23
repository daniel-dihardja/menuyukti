import { OrderItem } from "@/lib/domain/sales.types";

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

export function mapToOrderItem(row: NormalizedRow): OrderItem {
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
    datetime:
      (row.SalesDateIn as Date) ??
      (row.OrderTime as Date) ??
      (row.SalesDate as Date),
    branch: String(row.Branch),
  };
}

export function normalizeAndMapSalesRows(
  rows: Record<string, string>[]
): OrderItem[] {
  return normalizeExcelRows(rows).map(mapToOrderItem);
}
