import { readSalesRecapExcel } from "@/lib/excel/excel-reader";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "NO_FILE_UPLOADED" }, { status: 400 });
    }

    const rows = await readSalesRecapExcel(file);

    return NextResponse.json(rows);
  } catch (error: unknown) {
    console.error("Upload error:", error);

    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
