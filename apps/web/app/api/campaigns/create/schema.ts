import { z } from 'zod'

export const createCampaignSchema = z.object({
  locationId: z.number().int().positive(),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
