import { touchAgentThread, type AgentThreadRecord } from '@/lib/chat/agent-thread-registry'

/**
 * Venue switch rule: keep the same chat thread and rebind its locationId.
 * Clears analyticsRunId because sales reports are venue-scoped.
 */
export function rebindAgentThreadLocation(
  threadId: string,
  locationId: number,
): AgentThreadRecord | null {
  if (!Number.isInteger(locationId) || locationId < 1) {
    throw new Error('Invalid locationId')
  }
  return touchAgentThread(threadId, { locationId, analyticsRunId: null })
}
