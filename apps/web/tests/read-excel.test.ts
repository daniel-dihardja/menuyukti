import { describe, it, expect, afterEach } from "vitest";
import { runExcelPipeline } from "@/lib/pos/esb/excel-pipeline";
import * as XLSX from "xlsx";
import fs from "fs/promises";
import path from "path";

type ExcelCell = string | number | boolean | null;
type ExcelAOA = ExcelCell[][];

const TEMP_DIR = path.join(import.meta.dirname, ".vitest-tmp");

async function createExcelFile(data: ExcelAOA, filename: string) {
  await fs.mkdir(TEMP_DIR, { recursive: true });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  const filePath = path.join(TEMP_DIR, filename);

  await fs.mkdir(path.dirname(filePath), { recursive: true });

  XLSX.writeFile(wb, filePath);

  return filePath;
}

afterEach(async () => {
  await fs.rm(TEMP_DIR, { recursive: true, force: true }).catch(() => {});
});

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
  });
});
