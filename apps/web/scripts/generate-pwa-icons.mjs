/**
 * One-shot generator for PWA icons from an inline SVG (brand placeholder).
 * Run: node scripts/generate-pwa-icons.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const iconsDir = path.join(root, 'public', 'icons')

const svgStandard = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.19)}" fill="#18181b"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="${Math.round(size * 0.45)}" font-weight="700" fill="#fafafa">M</text>
</svg>`

/** Extra padding for maskable safe zone (~80% inner circle). */
const svgMaskable = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#18181b"/>
  <rect x="56" y="56" width="400" height="400" rx="72" fill="#27272a"/>
  <text x="256" y="285" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="200" font-weight="700" fill="#fafafa">M</text>
</svg>`

async function main() {
  fs.mkdirSync(iconsDir, { recursive: true })

  await sharp(Buffer.from(svgStandard(512)))
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'))

  await sharp(Buffer.from(svgStandard(512)))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'))

  await sharp(Buffer.from(svgMaskable)).png().toFile(path.join(iconsDir, 'icon-512-maskable.png'))

  await sharp(Buffer.from(svgStandard(512)))
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'))

  console.log(
    'Wrote public/icons/*.png — keep public/favicon.ico in sync manually if you change branding.',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
