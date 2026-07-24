/** Shape of error fields on SSE chunks from `apps/agents` POST /chat. */
export type PythonStreamErrorFields = {
  /** Agents `structured_error_payload` uses `error: true` + `message`; older streams used a string. */
  error?: string | boolean
  message?: string
}

/** Prefer `message` when agents sends `{ error: true, message }`; fall back to string `error`. */
export function pythonStreamErrorText(data: PythonStreamErrorFields): string {
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message.trim()
  }
  if (typeof data.error === 'string' && data.error.trim()) {
    return data.error.trim()
  }
  return 'Chat request failed'
}
