import { readExcel } from "@/lib/excel/excel-reader";
import {
  validateExcelWorkbook,
  type ValidationResult,
  type ValidationError,
} from "@/lib/pos/esb/excel-validator";
import {
  normalizeExcelRows,
  type NormalizedRow,
} from "@/lib/pos/esb/excel-normalizer";

export type EsbExcelPipelineSuccess = {
  ok: true;
  rows: NormalizedRow[];
};

export type EsbExcelPipelineFailure = {
  ok: false;
  errors: ValidationError[];
};

export type EsbExcelPipelineResult =
  | EsbExcelPipelineSuccess
  | EsbExcelPipelineFailure;

/**
 * Runs the full ESB Excel pipeline:
 * - reads the Excel file (using the given header row, default 12),
 * - validates the workbook structure,
 * - normalizes all data rows into typed values.
 *
 * @param filePath - Path to the ESB Excel export (.xlsx).
 * @param headerRow - 1-based index of the header row in the sheet (defaults to 12 for ESB reports).
 * @returns An object with `ok: true` and normalized `rows` on success,
 *          or `ok: false` and a list of `errors` if validation fails.
 */
export async function runExcelPipeline(
  filePath: string,
  headerRow = 12
): Promise<EsbExcelPipelineResult> {
  const { workbook, rows } = await readExcel(filePath, headerRow);

  const validation: ValidationResult = validateExcelWorkbook(workbook);
  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors,
    };
  }

  const normalizedRows = normalizeExcelRows(rows);

  return {
    ok: true,
    rows: normalizedRows,
  };
}
