import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { POST } from "@/app/api/upload/route";

function createFormRequest(filePath: string, filename: string) {
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], filename);
  const formData = new FormData();
  formData.append("file", file);

  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => {
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) return;
  for (const file of fs.readdirSync(tmpDir)) {
    fs.unlinkSync(path.join(tmpDir, file));
  }
});

describe("Upload API — valid excel upload", () => {
  it("uploads a valid .xlsx file to tmp directory and returns a jobId", async () => {
    const fixturePath = path.join(
      process.cwd(),
      "tests/fixtures/excel/esb/valid.xlsx",
    );

    const req = createFormRequest(fixturePath, "valid.xlsx");
    const res = await POST(req);
    const data = await res.json();

    expect(typeof data.jobId).toBe("string");
    expect(data.jobId.length).toBeGreaterThan(0);

    const tmpDir = path.join(process.cwd(), "tmp");
    const files = fs.readdirSync(tmpDir);

    expect(files.length).toBe(1);

    const uploadedFile = path.join(tmpDir, files[0] as string);
    expect(fs.existsSync(uploadedFile)).toBe(true);

    try {
      fs.unlinkSync(uploadedFile);
    } catch {
      /* ignore */
    }
  });
});
