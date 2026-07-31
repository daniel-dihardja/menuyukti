/** Shared SWR fetcher for chat visualization BFF GET endpoints. */
export async function chatVizJsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Chat visualization fetch failed: ${res.status}`)
  }
  return (await res.json()) as T
}

export function chatVizQueryUrl(
  path: string,
  locationId: number,
  analyticsRunId: number | null,
): string {
  const params = new URLSearchParams({ locationId: String(locationId) })
  if (analyticsRunId !== null) {
    params.set('analyticsRunId', String(analyticsRunId))
  }
  return `${path}?${params.toString()}`
}
