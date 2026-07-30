/**
 * Zod schemas for generic GraphQL `Node` shapes.
 */

import { z } from 'zod'

const baseNode = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  path: z.string(),
  parentId: z.string().nullable(),
  locationId: z.number().nullable(),
})

export const unknownNodeSchema = baseNode.extend({
  nodeType: z.string(),
  data: z.unknown().nullable(),
})

export type UnknownNode = z.infer<typeof unknownNodeSchema>
export type AnyNode = UnknownNode
