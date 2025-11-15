import { readExcel } from "./excel-reader";
import { validateExcelWorkbook } from "./excel-validator";
import { normalizeExcelRows } from "./excel-normalizer";
import path from "path";

async function testPipeline() {
  try {
    const filePath = path.join(
      process.cwd(),
      "reports",
      "Sales_Recapitulation_Detail_Report_Jan-Mar_2025.xlsx"
    );

    console.log("Testing Excel Pipeline");
    console.log("Reading:", filePath);

    const { workbook, rows } = await readExcel(filePath, 12);

    console.log("Reader executed successfully");
    console.log("Total rows:", rows.length);

    if (rows.length === 0) {
      console.warn(
        "Warning: reader returned 0 rows. Check headerRow or file format."
      );
    }

    console.log("Running validation...");

    const validation = validateExcelWorkbook(workbook);

    if (!validation.ok) {
      console.log("Validation failed:");
      console.dir(validation.errors, { depth: null });
      return;
    }

    console.log("Validation passed.");

    console.log("\nNormalizing rows...");
    const normalized = normalizeExcelRows(rows);

    console.log("Normalization complete.");
    console.log("\nFirst normalized row:");
    console.dir(normalized[0], { depth: null });

    console.log("\nPipeline test completed.\n");
  } catch (err) {
    console.error("Pipeline test failed:");
    console.error(err);
  }
}

testPipeline();
