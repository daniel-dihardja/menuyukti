import * as XLSX from "xlsx";
import { detectPOS, POSConfig } from "@/lib/pos";

export type ExcelRow = Record<string, unknown>;

export interface ExcelParseResult {
  pos: string;
  config: POSConfig;
  rows: ExcelRow[];
}

export async function readSalesRecapExcel(
  file: File
): Promise<ExcelParseResult> {
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

  const cellA1 = sheet["A1"]?.v ?? null;
  if (!cellA1 || typeof cellA1 !== "string") {
    throw new Error("INVALID_HEADER_CELL");
  }

  const matchedPOS = detectPOS(cellA1);
  if (!matchedPOS) {
    throw new Error(`UNRECOGNIZED_POS_FORMAT: ${cellA1}`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { range: 11 }) as ExcelRow[];

  return {
    pos: matchedPOS.name,
    config: matchedPOS,
    rows,
  };
}
