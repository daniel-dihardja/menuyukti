import { describe, it, expect } from "vitest";
import fs from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";

import { runExcelPipeline } from "@/lib/pos/esb/excel-pipeline";

type ExcelCell = string | number | boolean | null;
type ExcelAOA = ExcelCell[][];

async function createExcelFile(
  data: ExcelAOA,
  filename: string
): Promise<string> {
  const tempDir = path.join(import.meta.dirname, ".vitest-tmp");
  await fs.mkdir(tempDir, { recursive: true });

  const filePath = path.join(tempDir, filename);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.unlink(filePath);
  } catch {}

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  XLSX.writeFile(wb, filePath);

  return filePath;
}

describe("runExcelPipeline()", () => {
  it("returns validation error when workbook fails validation", async () => {
    const filePath = await createExcelFile(
      [["Wrong Header"], ["ColA", "ColB"], ["Value1", "Value2"]],
      "invalid.xlsx"
    );

    const result = await runExcelPipeline(filePath, 2);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.code).toBe("INVALID_A1");
  });

  it("returns normalized sale items when validation succeeds", async () => {
    const filePath = await createExcelFile(
      [
        ["Sales Recapitulation Detail Report"],
        [
          "Bill Number",
          "Sales Number",
          "Menu",
          "Menu Category",
          "Qty",
          "Price",
          "Total",
          "Branch",
          "SalesDateIn",
        ],
        [
          "B100",
          "S100",
          "Americano",
          "Drink",
          "3",
          "20000",
          "60000",
          "Jakarta",
          45659,
        ],
      ],
      "valid.xlsx"
    );

    const result = await runExcelPipeline(filePath, 2);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");

    expect(result.rows.length).toBe(1);

    const item = result.rows[0];

    expect(item).toMatchObject({
      billNumber: "B100",
      salesNumber: "S100",
      menuName: "Americano",
      category: "Drink",
      qty: 3,
      price: 20000,
      revenue: 60000,
      branch: "Jakarta",
    });

    expect(item?.datetime).toBeInstanceOf(Date);
    expect(item?.datetime.getFullYear()).toBe(2025);
  });
});
