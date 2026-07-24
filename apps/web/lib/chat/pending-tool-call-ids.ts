/**
 * Track pending AI SDK toolCallIds when bridging agents SSE tool events.
 * Prefer explicit LangChain tool_call_id; fall back to FIFO per tool name.
 */

export function pushPendingToolCallId(
  pendingByName: Map<string, string[]>,
  toolName: string,
  toolCallId: string,
): void {
  const queue = pendingByName.get(toolName)
  if (queue) {
    queue.push(toolCallId)
    return
  }
  pendingByName.set(toolName, [toolCallId])
}

export function takePendingToolCallId(
  pendingByName: Map<string, string[]>,
  toolName: string,
): string | undefined {
  const queue = pendingByName.get(toolName)
  if (!queue || queue.length === 0) {
    return undefined
  }
  const id = queue.shift()
  if (queue.length === 0) {
    pendingByName.delete(toolName)
  }
  return id
}

/** Resolve the toolCallId for a tool_end event; drain pending when matched. */
export function resolveToolEndCallId(
  pendingByName: Map<string, string[]>,
  toolName: string,
  toolCallIdFromAgents: string | undefined,
  fallbackId: string,
): string {
  const fromAgents =
    typeof toolCallIdFromAgents === 'string' && toolCallIdFromAgents.trim()
      ? toolCallIdFromAgents.trim()
      : undefined
  if (fromAgents) {
    const queue = pendingByName.get(toolName)
    if (queue) {
      const idx = queue.indexOf(fromAgents)
      if (idx >= 0) {
        queue.splice(idx, 1)
        if (queue.length === 0) {
          pendingByName.delete(toolName)
        }
      }
    }
    return fromAgents
  }
  return takePendingToolCallId(pendingByName, toolName) ?? fallbackId
}
