import { z } from 'zod'

export const updateLocationFrontpageSchema = z.object({
  tagline: z.string().max(512).nullable().optional(),
  showGuestFavorites: z.boolean(),
  showPopularCombos: z.boolean(),
})

export type UpdateLocationFrontpageBody = z.infer<typeof updateLocationFrontpageSchema>
