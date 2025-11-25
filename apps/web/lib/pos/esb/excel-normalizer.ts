import { OrderItemRaw } from "@/lib/domain/sales.types";

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
 */
function isExcelDateSerial(num: number): boolean {
  if (num < 20000 || num > 50000) return false;

  const d = excelSerialToDate(num);
  const year = d.getUTCFullYear();

  return year >= 2000 && year <= 2100;
}

/**
 * Normalize individual cell values
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
 * Extract only OrderTime as the Date
 */
function pickOrderTime(row: NormalizedRow): Date | null {
  const val = row.OrderTime;
  return val instanceof Date ? val : null;
}

/**
 * Determines if this is a real sales row:
 * SalesNumber must be present.
 */
function isValidOrderRow(row: NormalizedRow): boolean {
  return row.SalesNumber != null && row.SalesNumber !== "";
}

/**
 * Map a normalized row into an OrderItem
 */
export function mapToOrderItem(row: NormalizedRow): OrderItemRaw {
  const datetime = pickOrderTime(row);

  if (!datetime) {
    throw new Error(
      `Missing datetime (OrderTime) for row with BillNumber=${row.BillNumber}`
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
    netTotal: Number(row.TotalAfterBillDiscount),
    datetime,
  };
}

/**
 * Normalize and map all rows
 * -- skip footer rows where SalesNumber is empty
 */
export function normalizeAndMapSalesRows(
  rows: Record<string, string>[]
): OrderItemRaw[] {
  return normalizeExcelRows(rows).filter(isValidOrderRow).map(mapToOrderItem);
}
