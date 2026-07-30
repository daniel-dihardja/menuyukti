/**
 * Node parsing utilities for GraphQL payloads.
 */

import { unknownNodeSchema, type AnyNode } from './any-nodes'

/**
 * Parse a single node from GraphQL JSON. Falls back to a generic node shape so
 * callers can still narrow on `nodeType`.
 */
export function parseNode(raw: unknown): AnyNode {
  const u = unknownNodeSchema.safeParse(raw)
  if (u.success) {
    return u.data
  }
  throw new Error(
    `Invalid node shape: ${typeof raw === 'object' && raw !== null ? JSON.stringify(raw) : String(raw)}`,
  )
}

export function parseNodeNullable(raw: unknown | null): AnyNode | null {
  if (raw == null) {
    return null
  }
  return parseNode(raw)
}

export function parseNodes(raw: unknown): AnyNode[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.map(parseNode)
}
