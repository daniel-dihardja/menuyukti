import { z } from 'zod'

import { MAX_GENERATION_REFERENCES } from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-constants'
import { isSafeAssetFilename, isSafePhotoFilename } from '@/lib/assets/storage'
import { CHAT_MODE_IDS } from '@/lib/chat/chat-modes'
import { CHAT_MAX_IMAGES } from '@/lib/chat/chat-image-limits'
import { POST_IMAGE_FORMAT_IDS, POST_IMAGE_QUALITY_IDS } from '@/lib/posts/leonardo-post-dimensions'
import { LEONARDO_POST_MODEL_IDS } from '@/lib/posts/leonardo-post-models'
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

const postMediaFilenameSchema = z
  .string()
  .min(1)
  .refine((name) => isSafeAssetFilename(name), 'Invalid post media filename')

const solidBackgroundHexSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Expected #rrggbb color')

/** Same shapes as ``/api/posts/generate`` references. */
export const chatGenerationReferenceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('previous-result'),
    filename: z.string().min(1),
  }),
  z.object({
    type: z.literal('photo'),
    name: z.string().min(1),
  }),
  z.object({
    type: z.literal('background-color'),
    color: solidBackgroundHexSchema,
  }),
])

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
  /** Post creator media filenames (`users/<id>/posts/…`) to load as vision inputs (max 4). */
  referencedPostMediaNames: z.array(postMediaFilenameSchema).max(CHAT_MAX_IMAGES).optional(),
  /** Opaque id for `/agent` chat (no workflow); required by agents when `workflowId` is absent. */
  agentThreadId: z.string().min(1).optional(),
  /**
   * When set with `workflowId`, agents use a distinct LangGraph thread so "clear chat" can start
   * a fresh checkpoint without changing the workflow id.
   */
  workflowChatSessionId: z.string().uuid().optional(),
  /** Opt-in chat mode (general vs focused assistants). Agents accept but may ignore until wired. */
  chatMode: z.enum(CHAT_MODE_IDS).optional(),
  /** Vercel AI Gateway model id (provider/model); validated by agents allowlist. */
  model: z.string().min(1).max(120).optional(),
  /** IG Studio Post Creator — enables generate_instagram_post_image when both ids are set. */
  postId: z.string().regex(/^\d+$/, 'Invalid post id').optional(),
  pageId: z.string().regex(/^\d+$/, 'Invalid page id').optional(),
  generationModel: z.enum(LEONARDO_POST_MODEL_IDS).optional(),
  imageFormat: z.enum(POST_IMAGE_FORMAT_IDS).optional(),
  imageQuality: z.enum(POST_IMAGE_QUALITY_IDS).optional(),
  styleId: z.number().int().positive().optional(),
  generationReferences: z
    .array(chatGenerationReferenceSchema)
    .max(MAX_GENERATION_REFERENCES)
    .optional(),
})

export type ChatRequestBody = z.infer<typeof chatRequestBodySchema>
