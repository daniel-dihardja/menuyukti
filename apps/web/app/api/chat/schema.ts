import { z } from "zod";

const messagePartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
}).passthrough();

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.string(),
  parts: z.array(messagePartSchema).optional(),
}).passthrough();

export const chatRequestBodySchema = z.object({
  messages: z.array(messageSchema).optional().default([]),
  analyticsId: z.number().optional(),
  locationId: z.number().optional(),
});

export type ChatRequestBody = z.infer<typeof chatRequestBodySchema>;
