/**
 * Clerk keys for server / tooling.
 *
 * **Browser / ClerkProvider:** set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (inlined at build time).
 * **Middleware / server:** `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` per Clerk docs.
 */
export function getClerkSecretKey(): string | undefined {
  const v = process.env.CLERK_SECRET_KEY?.trim()
  return v || undefined
}
