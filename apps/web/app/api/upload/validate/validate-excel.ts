import * as XLSX from "xlsx";
import { promises as fs } from "fs";

export interface ExcelValidationResult {
  valid: boolean;
  message: string;
  sheetName?: string;
  headers?: string[];
  rowCount?: number;
  missingColumns?: string[];
}

export async function validateExcel(
  filePath: string
): Promise<ExcelValidationResult> {
  try {
    // Ensure file exists
    await fs.access(filePath);

    const workbook = XLSX.readFile(filePath);

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { valid: false, message: "Excel file contains no sheets." };
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName as string];

    if (!sheet) {
      return { valid: false, message: "No valid sheet found in Excel file." };
    }

    const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
    if (json.length === 0) {
      return { valid: false, message: "Excel file is empty." };
    }

    const headers = Object.keys(json[0] || {});
    const requiredHeaders = ["menu_name", "price"]; // adjust as needed
    const missing = requiredHeaders.filter((h) => !headers.includes(h));

    if (missing.length > 0) {
      return {
        valid: false,
        message: "Missing required columns.",
        missingColumns: missing,
      };
    }

    return {
      valid: true,
      message: "Excel validated successfully.",
      sheetName,
      headers,
      rowCount: json.length,
    };
  } catch (error) {
    console.error("validateExcel error:", error);
    return { valid: false, message: "Failed to read or validate Excel file." };
  }
}
