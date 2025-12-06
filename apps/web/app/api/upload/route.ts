// app/api/upload/route.ts
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

    const result = await readSalesRecapExcel(file);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Upload error:", error);

    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
