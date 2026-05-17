import sharp from 'sharp'

const WEBP_QUALITY = 85
const MAX_EDGE = 1024

export type PreparedUploadImage = {
  webpBuffer: Buffer
  width: number
  height: number
}

/**
 * Applies EXIF orientation, resizes for canvas assets, and encodes WebP.
 * Mobile camera JPEGs often store landscape pixels with an Orientation tag;
 * autoOrient ensures stored output matches what users saw in the camera UI.
 */
export async function prepareUploadImage(buffer: Buffer): Promise<PreparedUploadImage> {
  const oriented = sharp(buffer, { autoOrient: true })
  const metadata = await oriented.metadata()
  const width = metadata.width
  const height = metadata.height

  if (!width || !height) {
    throw new Error('Could not read image dimensions')
  }

  const isLandscapeOrSquare = width >= height
  const webpBuffer = await sharp(buffer, { autoOrient: true })
    .resize(
      isLandscapeOrSquare
        ? { height: MAX_EDGE, withoutEnlargement: false }
        : { width: MAX_EDGE, withoutEnlargement: false },
    )
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()

  const resizedMeta = await sharp(webpBuffer).metadata()
  const rw = resizedMeta.width ?? width
  const rh = resizedMeta.height ?? height

  return { webpBuffer, width: rw, height: rh }
}
