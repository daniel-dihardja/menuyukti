import { z } from 'zod'

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

export type CreateLocationInput = z.infer<typeof createLocationSchema>
