import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import fs from "fs/promises";
import path from "path";

import {
  ASSETS_PUBLIC_PREFIX,
  getUserAssetsDir,
  isSafeAssetFilename,
} from "@/lib/assets/storage";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dir = getUserAssetsDir(userId);
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return NextResponse.json({ items: [] });
    }
    throw e;
  }

  const items = await Promise.all(
    names.filter((n) => n.endsWith(".webp") && isSafeAssetFilename(n)).map(async (name) => {
      const filePath = path.join(dir, name);
      const stat = await fs.stat(filePath);
      return {
        name,
        url: `${ASSETS_PUBLIC_PREFIX}/${encodeURIComponent(userId)}/${name}`,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    }),
  );

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ items });
}
