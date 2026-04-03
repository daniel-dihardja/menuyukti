import fs from "fs/promises";
import path from "path";

/** Public URL prefix (served from `public/uploads/assets`). */
export const ASSETS_PUBLIC_PREFIX = "/uploads/assets";

export function getUserAssetsDir(userId: string): string {
  return path.join(process.cwd(), "public", "uploads", "assets", userId);
}

export async function ensureUserAssetsDir(userId: string): Promise<string> {
  const dir = getUserAssetsDir(userId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Only allow UUID-based `.webp` filenames (no path segments). */
export function isSafeAssetFilename(name: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i.test(
    name,
  );
}
