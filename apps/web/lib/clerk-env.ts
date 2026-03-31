/**
 * Clerk keys for server / proxy.
 *
 * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is inlined at `next build` time. In Docker, if the image
 * was built without it, runtime env cannot fix it. Use `CLERK_PUBLISHABLE_KEY` (same value as the
 * publishable key) so Node reads it at runtime from the container environment.
 */
export function getClerkPublishableKey(): string | undefined {
  const fromRuntime = process.env.CLERK_PUBLISHABLE_KEY?.trim();
  if (fromRuntime) {
    return fromRuntime;
  }
  const fromPublic = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  return fromPublic || undefined;
}

export function getClerkSecretKey(): string | undefined {
  const v = process.env.CLERK_SECRET_KEY?.trim();
  return v || undefined;
}
