import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { validateExcelWorkbook } from "@/lib/excel/excel-validator";

function createWorkbookWithA1(value: string) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([[value]]);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return wb;
}

describe("validateExcelWorkbook", () => {
  it("returns ok=true for correct A1 value", () => {
    const wb = createWorkbookWithA1("Sales Recapitulation Detail Report");

    const result = validateExcelWorkbook(wb);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("returns an INVALID_A1 error for wrong A1 value", () => {
    const wb = createWorkbookWithA1("Wrong Value");

    const result = validateExcelWorkbook(wb);

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("INVALID_A1");
    expect(result.errors[0]?.cell).toBe("A1");
    expect(result.errors[0]?.message).toContain(`Expected A1`);
  });
});
