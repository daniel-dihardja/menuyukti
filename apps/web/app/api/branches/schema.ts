import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and kebab-case"),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
