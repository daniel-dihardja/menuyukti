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
  const tempDir = path.join(process.cwd(), ".vitest-tmp");
  await fs.mkdir(tempDir, { recursive: true });

  const filePath = path.join(tempDir, filename);

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

  it("returns normalized rows when validation succeeds", async () => {
    const filePath = await createExcelFile(
      [
        ["Sales Recapitulation Detail Report"],
        ["ColA", "ColB"],
        ["Value1", "123"],
      ],
      "valid.xlsx"
    );

    const result = await runExcelPipeline(filePath, 2);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");

    expect(result.rows.length).toBe(1);
    expect(result.rows[0]).toEqual({
      ColA: "Value1",
      ColB: 123,
    });
  });
});
