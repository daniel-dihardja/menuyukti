import { z } from 'zod'

/** PATCH body: at least one of `name` or `goal` (matches GraphQL updateNode). */
export const patchWorkflowRootSchema = z
  .object({
    name: z.string().trim().min(1).max(256).optional(),
    goal: z.string().optional(),
  })
  .refine((d) => d.name !== undefined || d.goal !== undefined, {
    message: 'Provide at least one of name or goal',
    path: ['name'],
  })
