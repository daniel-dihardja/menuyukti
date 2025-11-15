import { describe, it, expect } from "vitest";
import { readExcel } from "@/lib/excel-reader";
import * as XLSX from "xlsx";
import fs from "fs/promises";
import path from "path";

type ExcelCell = string | number | boolean | Date | null;
type ExcelData = ExcelCell[][];

async function createExcelFile(data: ExcelData, filename: string) {
  const tempDir = path.join(process.cwd(), ".vitest-tmp");
  await fs.mkdir(tempDir, { recursive: true });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  const filePath = path.join(tempDir, filename);
  XLSX.writeFile(wb, filePath);
  return filePath;
}
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
