import { z } from 'zod'

export const awardCrmCashbackBodySchema = z.object({
  amount: z
    .number()
    .int()
    .refine((value) => value !== 0, { message: 'amount must be a non-zero integer' }),
  label: z.string().trim().max(256).optional(),
})
