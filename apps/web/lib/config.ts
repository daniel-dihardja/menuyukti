/**
 * Base URL for the agents service (no trailing slash), or null if not configured.
 */
export function getAgentsBaseUrl(): string | null {
  const url = process.env.AGENTS_URL?.trim();
  if (!url) return null;
  return url.replace(/\/$/, "");
}
