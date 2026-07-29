import { z } from 'zod'

export const createEnrollmentTokenBodySchema = z.object({
  appId: z.number().int().positive(),
})
