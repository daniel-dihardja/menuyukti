export type AnalyticsRunNameSource = {
  id: number
  name: string
}

export type ResolveAnalyticsRunNameFallbacks = {
  none: string
  unavailable: string
}

/**
 * Resolve a display label for a chat-linked analytics (sales) report id.
 */
export function resolveAnalyticsRunName(
  runs: readonly AnalyticsRunNameSource[],
  analyticsRunId: number | null,
  fallbacks: ResolveAnalyticsRunNameFallbacks,
): string {
  if (analyticsRunId === null) return fallbacks.none
  const match = runs.find((run) => run.id === analyticsRunId)
  if (!match) return fallbacks.unavailable
  const name = match.name.trim()
  return name || fallbacks.unavailable
}
