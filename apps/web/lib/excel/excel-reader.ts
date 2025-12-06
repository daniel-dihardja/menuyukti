import * as XLSX from "xlsx";

// The rows returned by XLSX.sheet_to_json
export type ExcelRow = Record<string, unknown>;

export async function readSalesRecapExcel(file: File): Promise<ExcelRow[]> {
  // Only .xlsx allowed
  if (!file.name.endsWith(".xlsx")) {
    throw new Error("INVALID_FILE_TYPE");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) {
    throw new Error("NO_SHEETS_FOUND");
  }

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    throw new Error("SHEET_NOT_FOUND");
  }

  // Validate A1
  const cellA1 = sheet["A1"]?.v ?? null;
  const expectedTitle = "Sales Recapitulation Detail Report";

  if (cellA1 !== expectedTitle) {
    throw new Error(
      `INVALID_REPORT_TYPE: expected '${expectedTitle}' but got '${cellA1}'`
    );
  }

  // Parse rows starting from header row (row 12 = index 11)
  const rows = XLSX.utils.sheet_to_json(sheet, { range: 11 });

  return rows as ExcelRow[];
}
