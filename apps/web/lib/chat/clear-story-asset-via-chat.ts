import {
  parseStoryAssetsToolOutput,
  type StoryAssetRef,
} from '@/lib/chat/story-assets-from-messages'

type ClearStoryAssetArgs = {
  name: string
  locationId: number
  analyticsRunId: number | null
  chatMode: string
  model: string
  signal?: AbortSignal
} & (
  | { agentThreadId: string; workflowId?: never; workflowChatSessionId?: never }
  | {
      workflowId: string
      workflowChatSessionId: string | null
      agentThreadId?: never
    }
)

/**
 * POST /api/chat with storyAssetAction only; returns the confirmed scratchpad snapshot.
 */
export async function clearStoryAssetViaChat(args: ClearStoryAssetArgs): Promise<StoryAssetRef[]> {
  const identity =
    'agentThreadId' in args && args.agentThreadId
      ? { agentThreadId: args.agentThreadId }
      : {
          workflowId: args.workflowId,
          ...(args.workflowChatSessionId !== null
            ? { workflowChatSessionId: args.workflowChatSessionId }
            : {}),
        }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: args.signal,
    body: JSON.stringify({
      messages: [],
      ...identity,
      locationId: String(args.locationId),
      ...(args.analyticsRunId !== null ? { analyticsRunId: String(args.analyticsRunId) } : {}),
      chatMode: args.chatMode,
      model: args.model,
      storyAssetAction: { op: 'clear', name: args.name },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Clear story asset failed (${res.status})`)
  }

  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error('Clear story asset returned an empty body')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let snapshot: StoryAssetRef[] | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      const line = chunk
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith('data:'))
      if (!line) continue
      const payload = line.slice('data:'.length).trim()
      if (!payload || payload === '[DONE]') continue
      let data: unknown
      try {
        data = JSON.parse(payload)
      } catch {
        continue
      }
      if (!data || typeof data !== 'object') continue
      const obj = data as Record<string, unknown>
      if (obj.type === 'tool-output-available') {
        const parsed = parseStoryAssetsToolOutput(obj.output)
        if (parsed) snapshot = parsed.story_assets
      }
      if (obj.type === 'error') {
        const errText =
          typeof obj.errorText === 'string' ? obj.errorText : 'Clear story asset failed'
        throw new Error(errText)
      }
    }
  }

  if (snapshot === null) {
    throw new Error('Clear story asset did not return a snapshot')
  }
  return snapshot
}
