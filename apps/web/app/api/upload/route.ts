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

    const apiResponse = await fetch("http://localhost:8000/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: result,
      }),
    });

    if (!apiResponse.ok) {
      const text = await apiResponse.text();
      throw new Error(`ANALYTICS_API_ERROR: ${text}`);
    }

    const apiResult = await apiResponse.json();

    return NextResponse.json({
      status: "ok",
      analytics: apiResult,
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);

    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
