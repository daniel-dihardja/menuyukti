import * as XLSX from "xlsx";

export type ValidationError = {
  code: string;
  message: string;
  cell?: string;
};

export type ValidationResult = {
  ok: boolean;
  errors: ValidationError[];
};

function validateA1Value(
  sheet: XLSX.WorkSheet,
  expectedValue = "Sales Recapitulation Detail Report"
): ValidationError[] {
  const value = sheet["A1"]?.v;

  if (value !== expectedValue) {
    return [
      {
        code: "INVALID_A1",
        message: `Expected A1 to be "${expectedValue}" but got "${value ?? ""}".`,
        cell: "A1",
      },
    ];
  }

  return [];
}

/**
 * Validates the structure and required metadata of an ESB Excel workbook.
 *
 * This function performs lightweight top-level validation, ensuring:
 * - The workbook contains at least one sheet
 * - Cell A1 on the first sheet contains the expected ESB report title
 *
 * @param workbook - An XLSX workbook instance created by `XLSX.read(...)`.
 * @returns An object containing:
 *   - `ok: true` if validation passes
 *   - `ok: false` and a list of `errors` if validation fails
 */
export function validateExcelWorkbook(
  workbook: XLSX.WorkBook
): ValidationResult {
  const errors: ValidationError[] = [];

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName as string];

  if (!sheet) {
    return {
      ok: false,
      errors: [
        {
          code: "NO_SHEET",
          message: "Excel workbook contains no sheets.",
        },
      ],
    };
  }

  errors.push(...validateA1Value(sheet));

  return {
    ok: errors.length === 0,
    errors,
  };
}
