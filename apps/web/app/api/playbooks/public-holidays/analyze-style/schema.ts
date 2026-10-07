import { z } from 'zod'

export const styleAnalysisResultSchema = z.object({
  summary: z.string().min(1).max(1000),
  palette: z.string().min(1).max(500),
  lighting: z.string().min(1).max(500),
  medium: z.string().min(1).max(500),
  avoid: z.string().min(1).max(500),
})

export type StyleAnalysisResult = z.infer<typeof styleAnalysisResultSchema>

export const analyzeStyleBodySchema = z.object({
  styleImageName: z.string().trim().min(1).max(512),
  instructions: z.string().trim().max(2000).optional(),
})

export type AnalyzeStyleBody = z.infer<typeof analyzeStyleBodySchema>
