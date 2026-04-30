import { z } from 'zod'

/** PATCH body: workflow root currently supports name updates only. */
export const patchWorkflowRootSchema = z.object({
  name: z.string().trim().min(1).max(256),
})
