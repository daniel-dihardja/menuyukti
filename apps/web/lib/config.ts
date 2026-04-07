/**
 * Base URL for the LangChain / LangGraph agents service (`apps/agents`), no trailing slash.
 *
 * Resolution order: `AGENTS_URL` (e.g. docker-compose / production), `PYTHON_AGENTS_URL` (local override),
 * then `http://localhost:8001` for local dev.
 */
export function getPythonAgentsUrl(): string {
  const raw =
    process.env.AGENTS_URL?.trim() ||
    process.env.PYTHON_AGENTS_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return 'http://localhost:8001'
}
