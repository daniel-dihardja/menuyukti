import { z } from 'zod'

const messagePartSchema = z
  .object({
    type: z.string(),
    text: z.string().optional(),
  })
  .passthrough()

const messageSchema = z
  .object({
    id: z.string().optional(),
    role: z.string(),
    parts: z.array(messagePartSchema).optional(),
  })
  .passthrough()

export const chatRequestBodySchema = z.object({
  messages: z.array(messageSchema).optional().default([]),
  workflowId: z.string().regex(/^\d+$/, 'Invalid workflow id').optional(),
  milestoneId: z.string().regex(/^\d+$/, 'Invalid milestone id').optional(),
  locationId: z.string().regex(/^\d+$/, 'Invalid location id').optional(),
  /** When set, the BFF loads this milestone’s preset from GraphQL and inlines it into the user message (requires workflowId + locationId). */
  presetReferenceMilestoneId: z.string().regex(/^\d+$/, 'Invalid milestone id').optional(),
  /** Opaque id for `/agent` chat (no workflow); required by agents when `workflowId` is absent. */
  agentThreadId: z.string().min(1).optional(),
  /**
   * When set with `workflowId`, agents use a distinct LangGraph thread so "clear chat" can start
   * a fresh checkpoint without changing the workflow id.
   */
  workflowChatSessionId: z.string().uuid().optional(),
})

export type ChatRequestBody = z.infer<typeof chatRequestBodySchema>
