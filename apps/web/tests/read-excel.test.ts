import { describe, it, expect, afterEach } from "vitest";
import { readExcel } from "@/lib/excel/excel-reader";
import * as XLSX from "xlsx";
import fs from "fs/promises";
import path from "path";

type ExcelCell = string | number | boolean | Date | null;
type ExcelData = ExcelCell[][];

const TEMP_DIR = path.join(process.cwd(), ".vitest-tmp");

async function createExcelFile(data: ExcelData, filename: string) {
  await fs.mkdir(TEMP_DIR, { recursive: true });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  const filePath = path.join(TEMP_DIR, filename);
  XLSX.writeFile(wb, filePath);
  return filePath;
}

afterEach(async () => {
  try {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  } catch {
    /* ignore cleanup errors */
  }
});

describe("readExcel()", () => {
  it("reads rows correctly", async () => {
    const filePath = await createExcelFile(
      [
        ["Name", "Age"],
        ["Alice", "30"],
        ["Bob", "22"],
      ],
      "basic.xlsx"
    );

    const result = await readExcel(filePath);

    expect(result.rows).toEqual([
      { Name: "Alice", Age: "30" },
      { Name: "Bob", Age: "22" },
    ]);
  });
});
