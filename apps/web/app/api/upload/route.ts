import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs"; // ensures file system access

export async function POST(request: Request) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Only .xlsx files are allowed" },
        { status: 400 }
      );
    }

    // --- Use project/tmp directory in development ---
    const uploadDir = path.join(process.cwd(), "tmp");
    await fs.mkdir(uploadDir, { recursive: true });

    // Convert file to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique file name
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filePath = path.join(uploadDir, filename);

    // Save file
    await fs.writeFile(filePath, buffer);

    // Respond with basic info (for dev visibility)
    return NextResponse.json({
      success: true,
      message: "File uploaded successfully.",
      filename,
      filePath, // absolute path in dev
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
