import builtinFlowsJson from './builtin-ai-flows.json'

import type { NanoBananaFlowConfig } from '@/lib/leonardo'

type BuiltinAiFlowRecord = {
  slug: string
  displayName: string
  model: string
  prompt: string
}

export type BuiltinAiFlowOption = Pick<BuiltinAiFlowRecord, 'slug' | 'displayName'>

const builtinFlows = builtinFlowsJson as BuiltinAiFlowRecord[]

const builtinFlowsBySlug = new Map(builtinFlows.map((flow) => [flow.slug, flow] as const))

export function listBuiltinAiFlowOptions(): BuiltinAiFlowOption[] {
  return builtinFlows.map(({ slug, displayName }) => ({ slug, displayName }))
}

export function getBuiltinAiFlowConfig(slug: string): NanoBananaFlowConfig | null {
  const flow = builtinFlowsBySlug.get(slug)
  if (!flow) return null
  return {
    model: flow.model,
    prompt: flow.prompt,
  }
}
