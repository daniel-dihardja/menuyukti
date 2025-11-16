import fs from "fs/promises";
import path from "path";
import { afterAll } from "vitest";

afterAll(async () => {
  const dir = path.join(process.cwd(), ".vitest-tmp");

  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {}
});
