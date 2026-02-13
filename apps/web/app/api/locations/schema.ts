import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and kebab-case"),
  currencyCode: z
    .string()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code")
    .default("IDR"),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
