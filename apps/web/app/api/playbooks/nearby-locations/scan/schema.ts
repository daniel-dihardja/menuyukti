import { z } from 'zod'

export const nearbyFocusSchema = z.enum(['lunch_demand', 'competitors', 'schools', 'hotels'])

export const nearbyNodeKindSchema = z.enum(['demand', 'competitor', 'landmark', 'origin'])

export const nearbyScanBodySchema = z.object({
  locationId: z.number().int().positive(),
  address: z.string().trim().min(1).max(512),
  instructions: z.string().trim().max(4000).optional(),
  focus: z.array(nearbyFocusSchema).min(1).max(4),
})

export const nearbyScanNodeSchema = z.object({
  id: z.string().min(1),
  kind: nearbyNodeKindSchema,
  name: z.string().min(1),
  placeId: z.string().nullable().optional(),
  lat: z.number(),
  lng: z.number(),
  types: z.array(z.string()).default([]),
  rating: z.number().nullable().optional(),
  address: z.string().nullable().optional(),
  distanceMeters: z.number().int().nullable().optional(),
  signals: z.array(z.string()).default([]),
  marketingHook: z.string().nullable().optional(),
  sources: z.array(z.string()).default([]),
})

export const nearbyScanResponseSchema = z.object({
  origin: nearbyScanNodeSchema,
  nodes: z.array(nearbyScanNodeSchema),
})

export type NearbyScanBody = z.infer<typeof nearbyScanBodySchema>
export type NearbyScanResponse = z.infer<typeof nearbyScanResponseSchema>
