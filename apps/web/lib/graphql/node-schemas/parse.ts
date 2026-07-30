/**
 * Node parsing utilities for GraphQL payloads.
 */

import { unknownNodeSchema, workflowNodeSchema, type AnyNode } from './workflow-nodes'

/**
 * Parse a single node from GraphQL JSON. Tries workflow, then falls back to a generic
 * node so callers can still narrow on `nodeType`.
 */
export function parseNode(raw: unknown): AnyNode {
  const w = workflowNodeSchema.safeParse(raw)
  if (w.success) {
    return w.data
  }
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
