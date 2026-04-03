import { GetObjectCommand, NoSuchKey } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { auth } from "@clerk/nextjs/server";

import { getS3Bucket, getS3Client, isSafeAssetFilename, userObjectKey } from "@/lib/assets/storage";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const name = url.searchParams.get("name")?.trim() ?? "";
  if (!name || !isSafeAssetFilename(name)) {
    return NextResponse.json({ message: "Invalid filename" }, { status: 400 });
  }

  const key = userObjectKey(userId, name);
  const s3 = getS3Client();
  const bucket = getS3Bucket();

  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    const body = result.Body;
    if (!body) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const webStream = Readable.toWeb(body as Readable);

    return new NextResponse(webStream as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": `attachment; filename="${name}"`,
        ...(result.ContentLength != null ? { "Content-Length": String(result.ContentLength) } : {}),
      },
    });
  } catch (err) {
    if (err instanceof NoSuchKey || (err as { name?: string })?.name === "NoSuchKey") {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    console.error("[assets/download] S3 GetObject failed", {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ message: "Download failed" }, { status: 502 });
  }
}
