export type ApiFetchResult<T> =
  | { ok: true; data: T; response: Response }
  | { ok: false; error: string; response: Response; data: unknown }

type ErrorBody = {
  error?: string
  message?: string
  code?: string
}

export function parseApiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const record = body as ErrorBody
    if (typeof record.message === 'string' && record.message.length > 0) {
      return record.message
    }
    if (typeof record.error === 'string' && record.error.length > 0) {
      return record.error
    }
  }
  return fallback
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => '')
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackError = 'Request failed',
): Promise<ApiFetchResult<T>> {
  const response = await fetch(input, init)
  const body = await readResponseBody(response)
  if (!response.ok) {
    return {
      ok: false,
      error: parseApiErrorMessage(body, fallbackError),
      response,
      data: body,
    }
  }
  return { ok: true, data: body as T, response }
}

export type AnalyticsRunListItem = {
  id: number
  name: string
}

export async function fetchAnalyticsList(
  locationId: number,
  init?: RequestInit,
): Promise<AnalyticsRunListItem[]> {
  const result = await apiFetch<AnalyticsRunListItem[] | ErrorBody>(
    `/api/analytics/list?locationId=${locationId}`,
    { cache: 'no-store', ...init },
    'Failed to load analytics',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return Array.isArray(result.data) ? result.data : []
}

export type WorkflowImportResult = {
  workflow?: { id: string }
}

export async function importWorkflowPayload(
  workflowId: string,
  payload: unknown,
  fallbackError = 'Import failed',
): Promise<string> {
  const result = await apiFetch<WorkflowImportResult>(
    `/api/workflows/${workflowId}/import`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    },
    fallbackError,
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  const newId = result.data.workflow?.id
  if (!newId) {
    throw new Error(fallbackError)
  }
  return newId
}
