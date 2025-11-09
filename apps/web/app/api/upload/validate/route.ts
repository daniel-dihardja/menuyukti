import { NextResponse } from "next/server";
import path from "path";

import { promises as fs } from "fs";
import { validateExcel } from "./validate-excel";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: "Missing 'filePath' in request body" },
        { status: 400 }
      );
    }

    // Validate file path to prevent directory traversal
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!filePath.startsWith(tmpDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Ensure file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Run validation logic
    const result = await validateExcel(filePath);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate Excel file" },
      { status: 500 }
    );
  }
}
