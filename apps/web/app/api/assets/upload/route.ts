import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import sharp from "sharp";

import { ASSETS_PUBLIC_PREFIX, ensureUserAssetsDir } from "@/lib/assets/storage";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/tiff",
]);

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
  }

  const mime = file.type.toLowerCase();
  if (!ALLOWED_TYPES.has(mime)) {
    return NextResponse.json({ message: "Invalid file type" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  if (!width || !height) {
    return NextResponse.json({ message: "Could not read image dimensions" }, { status: 400 });
  }

  const isLandscapeOrSquare = width >= height;
  const resized = sharp(buffer).resize(
    isLandscapeOrSquare
      ? { height: 1024, withoutEnlargement: false }
      : { width: 1024, withoutEnlargement: false },
  );

  const webpBuffer = await resized.webp({ quality: 85 }).toBuffer();

  const id = randomUUID();
  const filename = `${id}.webp`;
  const dir = await ensureUserAssetsDir(userId);
  const filePath = `${dir}/${filename}`;
  await fs.writeFile(filePath, webpBuffer);

  const stat = await fs.stat(filePath);
  const createdAt = stat.mtime.toISOString();
  const url = `${ASSETS_PUBLIC_PREFIX}/${encodeURIComponent(userId)}/${filename}`;

  return NextResponse.json({
    url,
    name: filename,
    size: stat.size,
    createdAt,
  });
}
