export const DEFAULT_LIST_FIRST = 100
export const DEFAULT_NODES_FIRST = 500

export function nextAfterIdFromNodes(nodes: Array<{ id: string }>): string | undefined {
  if (nodes.length === 0) return undefined
  return nodes[nodes.length - 1]?.id
}
