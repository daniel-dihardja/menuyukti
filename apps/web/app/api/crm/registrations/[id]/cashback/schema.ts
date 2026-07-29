import { z } from 'zod'

export const awardCrmCashbackBodySchema = z
  .object({
    paymentAmount: z.number().int().positive().optional(),
    redeemAmount: z.number().int().positive().optional(),
    label: z.string().trim().max(256).optional(),
  })
  .refine((value) => (value.paymentAmount !== undefined) !== (value.redeemAmount !== undefined), {
    message: 'exactly one of paymentAmount or redeemAmount is required',
  })
