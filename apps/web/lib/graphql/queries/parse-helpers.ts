/**
 * GraphQL parse helpers and shared node field selection.
 */

import { parseNode, parseNodeNullable, parseNodes, type AnyNode } from '../node-schemas'

export type {
  AnyNode,
  KnownNode,
  MilestoneNode,
  PassCriteriaData,
  ResultNode,
  WorkflowNode,
} from '../node-schemas'

export type NodeDataRaw = { node: unknown | null }
export type NodesDataRaw = { nodes: unknown[] }
export type CreateNodeDataRaw = { createNode: unknown }
export type UpdateNodeDataRaw = { updateNode: unknown }

export function parseNodeData(data: NodeDataRaw): { node: AnyNode | null } {
  return { node: parseNodeNullable(data.node) }
}

export function parseNodesData(data: NodesDataRaw): { nodes: AnyNode[] } {
  return { nodes: parseNodes(data.nodes) }
}

export function parseCreateNodeData(data: CreateNodeDataRaw): { createNode: AnyNode } {
  return { createNode: parseNode(data.createNode) }
}

export function parseUpdateNodeData(data: UpdateNodeDataRaw): { updateNode: AnyNode } {
  return { updateNode: parseNode(data.updateNode) }
}

/** Shared node fields for queries returning `NodeType` (includes milestone column payloads). */
export const NODE_SELECTION_FIELDS = `
      id
      name
      description
      nodeType
      path
      parentId
      locationId
      data
      milestoneGoal
      milestoneInput
      passCriterias
      milestonePresetData
      milestoneResult`
