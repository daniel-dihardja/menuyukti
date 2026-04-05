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

const nationalHolidaySchema = z
  .object({
    id: z.string(),
    localName: z.string(),
    name: z.string(),
    date: z.string(),
    type: z.string().optional(),
  })
  .passthrough()

export const chatRequestBodySchema = z.object({
  messages: z.array(messageSchema).optional().default([]),
  analyticsId: z.number().optional(),
  locationId: z.number().optional(),
  /** Campaign chat sends this every request; forwarded as campaign_id to gentic-agents. */
  campaignId: z.number().optional(),
  threadId: z.string().optional(),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  nationalHolidays: z.array(nationalHolidaySchema).nullable().optional(),
})

export type ChatRequestBody = z.infer<typeof chatRequestBodySchema>
