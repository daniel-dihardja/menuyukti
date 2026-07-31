/**
 * Clerk image CDN supports width, height, quality, and fit query params.
 * @see https://clerk.com/docs/guides/image-optimization
 */
const CLERK_IMAGE_HOST_SUFFIXES = ['.clerk.com', '.clerk.dev'] as const

export function isClerkImageUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return CLERK_IMAGE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  } catch {
    return false
  }
}

/** Hostnames allowed in next.config images.remotePatterns (keep in sync when adding patterns). */
export function isNextImageRemoteHost(hostname: string): boolean {
  if (hostname === 'picsum.photos' || hostname === 'lh3.googleusercontent.com') {
    return true
  }
  // Match next.config `*.clerk.com` / `*.clerk.dev` (and exact img/images hosts).
  if (
    CLERK_IMAGE_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
    )
  ) {
    return true
  }
  // Match next.config S3 wildcards (`*.s3.*.amazonaws.com`, `*.s3.amazonaws.com`).
  if (
    hostname.endsWith('.s3.amazonaws.com') ||
    /\.s3\.[a-z0-9-]+\.amazonaws\.com$/i.test(hostname)
  ) {
    return true
  }
  return false
}

export function withProfileImageParams(url: string, sizePx: number): string {
  try {
    const parsed = new URL(url)
    if (isClerkImageUrl(url)) {
      const dpr = 2
      parsed.searchParams.set('width', String(Math.round(sizePx * dpr)))
      parsed.searchParams.set('height', String(Math.round(sizePx * dpr)))
      parsed.searchParams.set('fit', 'crop')
      parsed.searchParams.set('quality', '85')
    }
    return parsed.toString()
  } catch {
    return url
  }
}
