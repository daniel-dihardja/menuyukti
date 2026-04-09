import { z } from 'zod'

export const createCampaignSchema = z.object({
  locationId: z.number().int().positive(),
  locationNodeId: z.string().min(1),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
