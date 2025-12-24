import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "NO_FILE_UPLOADED" }, { status: 400 });
    }

    // Forward file as multipart/form-data
    const forwardFormData = new FormData();
    forwardFormData.append("file", file, file.name);

    const apiResponse = await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: forwardFormData,
    });

    if (!apiResponse.ok) {
      const text = await apiResponse.text();
      throw new Error(`ANALYTICS_API_ERROR: ${text}`);
    }

    const apiResult = await apiResponse.json();

    return NextResponse.json(apiResult);
  } catch (error: unknown) {
    console.error("Upload error:", error);

    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
