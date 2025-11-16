import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { POST } from "@/app/api/upload/route";
import { NextRequest } from "next/server";

function createFormRequest(filePath: string, filename: string) {
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], filename);
  const formData = new FormData();
  formData.append("file", file);

  return new NextRequest("http://localhost/api/upload", {
    method: "POST",
    body: formData as any,
  });
}

describe("Upload API — valid excel upload", () => {
  it("uploads a valid .xlsx file to tmp directory", async () => {
    const fixturePath = path.join(
      process.cwd(),
      "tests/fixtures/excel/esb/valid.xlsx"
    );

    const req = createFormRequest(fixturePath, "valid.xlsx");
    const res = await POST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.filename).toContain("valid.xlsx");

    const uploadedFile = data.filePath;
    expect(fs.existsSync(uploadedFile)).toBe(true);

    try {
      fs.unlinkSync(uploadedFile);
    } catch (err) {
      console.warn("Cleanup warning (not fatal):", err);
    }
  });
});
