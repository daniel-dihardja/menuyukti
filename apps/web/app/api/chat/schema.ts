import { z } from 'zod'

import { isSafePhotoFilename } from '@/lib/assets/storage'
import { CHAT_MAX_IMAGES } from '@/lib/chat/chat-image-limits'
import { WORKFLOW_VISUALIZATION_ID_VALUES } from '@/lib/workflow/workflow-visualization-ids'

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

const mediaFilenameSchema = z
  .string()
  .min(1)
  .refine((name) => isSafePhotoFilename(name), 'Invalid media filename')

export const chatRequestBodySchema = z.object({
  messages: z.array(messageSchema).optional().default([]),
  workflowId: z.string().regex(/^\d+$/, 'Invalid workflow id').optional(),
  milestoneId: z.string().regex(/^\d+$/, 'Invalid milestone id').optional(),
  locationId: z.string().regex(/^\d+$/, 'Invalid location id').optional(),
  /** When set, the BFF loads this milestone’s preset from GraphQL and inlines it into the user message (requires workflowId + locationId). */
  presetReferenceMilestoneId: z.string().regex(/^\d+$/, 'Invalid milestone id').optional(),
  /** When set, the BFF loads this attached visualization and inlines analytics data (requires workflowId + locationId). */
  referencedVisualizationId: z.enum(WORKFLOW_VISUALIZATION_ID_VALUES).optional(),
  /** Workflow-linked analytics run; used when loading visualization references. */
  analyticsRunId: z.string().regex(/^\d+$/, 'Invalid analytics run id').optional(),
  /** Media library filenames to load from S3 and attach as vision inputs (max 4). */
  referencedMediaNames: z.array(mediaFilenameSchema).max(CHAT_MAX_IMAGES).optional(),
  /** Opaque id for `/agent` chat (no workflow); required by agents when `workflowId` is absent. */
  agentThreadId: z.string().min(1).optional(),
  /**
   * When set with `workflowId`, agents use a distinct LangGraph thread so "clear chat" can start
   * a fresh checkpoint without changing the workflow id.
   */
  workflowChatSessionId: z.string().uuid().optional(),
  /** Vercel AI Gateway model id (provider/model); validated by agents allowlist. */
  model: z.string().min(1).max(120).optional(),
})

export type ChatRequestBody = z.infer<typeof chatRequestBodySchema>
