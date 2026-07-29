import { z } from 'zod'

export const createCrmAppBodySchema = z.object({
  title: z.string().trim().min(1).max(256),
})

export const updateCrmAppBodySchema = z.object({
  title: z.string().trim().min(1).max(256),
  cashbackThresholdAmount: z.number().int().min(0),
  cashbackPercent: z.number().int().min(0).max(100),
})
