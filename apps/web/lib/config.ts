/**
 * Base URL for the gentic-agents HTTP API (no trailing slash), or null if not configured.
 *
 * Set `AGENTS_URL` in apps/web/.env.local (e.g. http://127.0.0.1:7000).
 * `AGENTS_API_URL` is accepted as an alias for older / e2e configs.
 */
export function getAgentsBaseUrl(): string | null {
  const raw = process.env.AGENTS_URL?.trim() || process.env.AGENTS_API_URL?.trim()
  if (!raw) return null
  return raw.replace(/\/$/, '')
}

/**
 * Base URL for the Python LangChain / LangGraph agents service (`apps/agents`), no trailing slash.
 *
 * Set `PYTHON_AGENTS_URL` in apps/web/.env.local (e.g. http://127.0.0.1:8001).
 * Defaults to `http://localhost:8001` when unset (local dev).
 */
export function getPythonAgentsUrl(): string {
  const raw = process.env.PYTHON_AGENTS_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return 'http://localhost:8001'
}
