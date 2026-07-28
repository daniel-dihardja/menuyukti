import { z } from 'zod'

export const createCrmAppBodySchema = z.object({
  title: z.string().trim().min(1).max(256),
})

export const updateCrmAppBodySchema = z.object({
  title: z.string().trim().min(1).max(256),
})
