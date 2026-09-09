import { z } from 'zod'

export const createPlaybookBodySchema = z.object({
  locationId: z.number().int().positive(),
  name: z.string().trim().min(1).max(256),
  playbookType: z.string().trim().min(1).max(64),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type CreatePlaybookBody = z.infer<typeof createPlaybookBodySchema>

export const updatePlaybookBodySchema = z.object({
  locationId: z.number().int().positive(),
  name: z.string().trim().min(1).max(256),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type UpdatePlaybookBody = z.infer<typeof updatePlaybookBodySchema>
