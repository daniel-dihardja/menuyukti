import builtinFlowsJson from './builtin-ai-flows.json'

import type { NanoBananaFlowConfig } from '@/lib/leonardo'

type BuiltinAiFlowRecord = {
  slug: string
  displayName: string
  model: string
  prompt: string
  styleIds?: string[]
  contexts?: BuiltinAiFlowContext[]
}

export type BuiltinAiFlowOption = Pick<BuiltinAiFlowRecord, 'slug' | 'displayName'>
export type BuiltinAiFlowContext = 'upload' | 'product-card' | 'design-create'

const builtinFlows = builtinFlowsJson as BuiltinAiFlowRecord[]

const builtinFlowsBySlug = new Map(builtinFlows.map((flow) => [flow.slug, flow] as const))

export function listBuiltinAiFlowOptions(): BuiltinAiFlowOption[] {
  return builtinFlows.map(({ slug, displayName }) => ({ slug, displayName }))
}

export function listBuiltinAiFlowOptionsForContext(
  context: BuiltinAiFlowContext,
): BuiltinAiFlowOption[] {
  return builtinFlows
    .filter((flow) => !flow.contexts || flow.contexts.includes(context))
    .map(({ slug, displayName }) => ({ slug, displayName }))
}

export function getBuiltinAiFlowConfig(slug: string): NanoBananaFlowConfig | null {
  const flow = builtinFlowsBySlug.get(slug)
  if (!flow) return null
  return {
    model: flow.model,
    prompt: flow.prompt,
    ...(flow.styleIds && flow.styleIds.length > 0 ? { styleIds: flow.styleIds } : {}),
  }
}
