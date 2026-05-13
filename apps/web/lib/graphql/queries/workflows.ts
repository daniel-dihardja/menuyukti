import type { AnyNode } from '../node-schemas'
import { NODE_SELECTION_FIELDS } from './parse-helpers'

export const CREATE_NODE_MUTATION = `
  mutation CreateNode($locationId: Int!, $nodeType: String!, $name: String, $description: String, $data: JSON, $parentId: ID) {
    createNode(locationId: $locationId, nodeType: $nodeType, name: $name, description: $description, data: $data, parentId: $parentId) {
${NODE_SELECTION_FIELDS}
    }
  }
`

export type CreateNodeData = {
  createNode: AnyNode
}

export const DELETE_NODE_MUTATION = `
  mutation DeleteNode($id: ID!) {
    deleteNode(id: $id)
  }
`

export type DeleteNodeData = {
  deleteNode: boolean
}

export const UPDATE_NODE_MUTATION = `
  mutation UpdateNode($id: ID!, $name: String, $data: JSON) {
    updateNode(id: $id, name: $name, data: $data) {
${NODE_SELECTION_FIELDS}
    }
  }
`

export type UpdateNodeData = {
  updateNode: AnyNode
}

export const EXPORT_WORKFLOW_MUTATION = `
  mutation ExportWorkflow($workflowId: ID!, $locationId: Int!) {
    exportWorkflow(workflowId: $workflowId, locationId: $locationId) {
      id
      workflowId
      locationId
      payload
      schemaVersion
      createdAt
      updatedAt
    }
  }
`

export type ExportWorkflowDataRaw = {
  exportWorkflow: {
    id: string
    workflowId: string
    locationId: number
    payload: unknown
    schemaVersion: string
    createdAt: string | null
    updatedAt: string | null
  }
}

export const WORKFLOW_EXPORTS_QUERY = `
  query WorkflowExports($locationId: Int!, $first: Int) {
    workflowExports(locationId: $locationId, first: $first) {
      id
      workflowId
      locationId
      payload
      schemaVersion
      createdAt
      updatedAt
    }
  }
`

export type WorkflowExportsDataRaw = {
  workflowExports: Array<{
    id: string
    workflowId: string
    locationId: number
    payload: unknown
    schemaVersion: string
    createdAt: string | null
    updatedAt: string | null
  }>
}

export const IMPORT_WORKFLOW_MUTATION = `
  mutation ImportWorkflow($locationId: Int!, $payload: JSON!) {
    importWorkflow(locationId: $locationId, payload: $payload) {
${NODE_SELECTION_FIELDS}
    }
  }
`

export type ImportWorkflowDataRaw = {
  importWorkflow: AnyNode
}

export const NODES_QUERY = `
  query Nodes($locationId: Int!, $nodeType: String, $parentId: ID, $first: Int, $afterId: ID) {
    nodes(locationId: $locationId, nodeType: $nodeType, parentId: $parentId, first: $first, afterId: $afterId) {
${NODE_SELECTION_FIELDS}
    }
  }
`

export type NodesData = {
  nodes: AnyNode[]
}

export const NODE_QUERY = `
  query Node($id: ID!) {
    node(id: $id) {
${NODE_SELECTION_FIELDS}
    }
  }
`

export type NodeData = {
  node: AnyNode | null
}

/** Wire payload for `WORKFLOW_CAMPAIGN_TREE_QUERY` before parsing nodes. */
export type WorkflowCampaignTreeDataRaw = {
  workflowCampaignTree: {
    workflow: unknown
    milestones: Array<{
      milestone: unknown
    }>
  } | null
}

export const WORKFLOW_CAMPAIGN_TREE_QUERY = `
  query WorkflowCampaignTree($workflowId: ID!) {
    workflowCampaignTree(workflowId: $workflowId) {
      workflow {
        ${NODE_SELECTION_FIELDS}
      }
      milestones {
        milestone {
          ${NODE_SELECTION_FIELDS}
        }
      }
    }
  }
`
