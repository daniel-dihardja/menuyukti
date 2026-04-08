import { z } from 'zod'

export const patchCampaignGoalSchema = z.object({
  goal: z.string(),
})
