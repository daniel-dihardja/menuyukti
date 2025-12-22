import * as XLSX from "xlsx";

export type ExcelRow = Record<string, unknown>;

export async function readSalesRecapExcel(file: File): Promise<ExcelRow[]> {
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

  // Adjust range if needed (e.g. skip header rows)
  const rows = XLSX.utils.sheet_to_json(sheet) as ExcelRow[];

  return rows;
}
