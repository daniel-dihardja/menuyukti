import { z } from 'zod'

export const createCampaignSchema = z.object({
  locationId: z.number().int().positive(),
  analyticsRunId: z.number().int().positive().optional(),
  templatePayload: z.unknown().optional(),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
