import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "NO_FILE_UPLOADED" }, { status: 400 });
    }

    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json({ error: "INVALID_FILE_TYPE" }, { status: 400 });
    }

    // Convert uploaded file to a Buffer for XLSX
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Read workbook directly from memory
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
    });

    const firstSheetName = workbook.SheetNames?.[0];

    if (!firstSheetName) {
      return NextResponse.json({ error: "NO_SHEETS_FOUND" }, { status: 400 });
    }

    const sheet = workbook.Sheets[firstSheetName];

    if (!sheet) {
      return NextResponse.json({ error: "SHEET_NOT_FOUND" }, { status: 400 });
    }

    // Read and validate A1
    const cellA1 = sheet["A1"]?.v ?? null;
    const expectedTitle = "Sales Recapitulation Detail Report";

    if (cellA1 !== expectedTitle) {
      return NextResponse.json(
        {
          error: "INVALID_REPORT_TYPE",
          detail: `Expected A1 to be '${expectedTitle}' but got '${cellA1}'`,
        },
        { status: 400 }
      );
    }

    // Parse JSON starting from row 12 (index 11)
    const rows = XLSX.utils.sheet_to_json(sheet, { range: 11 });

    console.log("Parsed rows:", rows);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}
