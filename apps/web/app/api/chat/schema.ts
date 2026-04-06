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
  campaignId: z.string().regex(/^\d+$/, 'Invalid campaign id').optional(),
  milestoneId: z.string().regex(/^\d+$/, 'Invalid milestone id').optional(),
})

export type ChatRequestBody = z.infer<typeof chatRequestBodySchema>
