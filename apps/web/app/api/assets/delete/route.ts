import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

import { getUserAssetsDir, isSafeAssetFilename } from "@/lib/assets/storage";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1),
});

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const { name } = parsed.data;
  if (!isSafeAssetFilename(name)) {
    return NextResponse.json({ message: "Invalid filename" }, { status: 400 });
  }

  const dir = getUserAssetsDir(userId);
  const filePath = path.join(dir, name);
  const resolvedDir = path.resolve(dir);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 });
  }

  try {
    await fs.unlink(filePath);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    throw e;
  }

  return NextResponse.json({ success: true });
}
