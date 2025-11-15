import * as XLSX from "xlsx";
import { promises as fs } from "fs";

export type RawRow = Record<string, string>;
export type RawExcel = {
  workbook: XLSX.WorkBook;
  rows: RawRow[];
};

export async function readExcel(
  filePath: string,
  headerRow = 1
): Promise<RawExcel> {
  const buffer = await fs.readFile(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName as string];

  if (!sheet) {
    throw new Error("Excel file has no sheets.");
  }

  const ref = sheet["!ref"];
  if (!ref) throw new Error("Sheet has no data.");

  const range = XLSX.utils.decode_range(ref);
  const headers: string[] = [];

  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow - 1, c });
    const cell = sheet[cellAddress];
    const header = cell ? String(cell.v).trim() : `Column_${c + 1}`;
    headers.push(header);
  }

  const rows: RawRow[] = [];

  for (let r = headerRow; r <= range.e.r; r++) {
    const row: RawRow = {};
    let empty = true;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const header = headers[c - range.s.c];
      if (!header) continue;

      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddress];
      const value = cell ? String(cell.v).trim() : "";

      if (value) empty = false;
      row[header] = value;
    }

    if (!empty) rows.push(row);
  }

  return { workbook, rows };
}
