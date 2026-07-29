import { isToolUIPart, type UIMessage } from 'ai'

export type StoryAssetRole = 'style' | 'product'

export type StoryAssetRef = {
  role: StoryAssetRole
  name: string
  note: string
}

export type StoryAssetsToolPayload = {
  ok: boolean
  action: 'save' | 'clear'
  story_assets: StoryAssetRef[]
  message: string
}

function isStoryAssetRole(value: unknown): value is StoryAssetRole {
  return value === 'style' || value === 'product'
}

function normalizeStoryAssets(raw: unknown): StoryAssetRef[] | null {
  if (!Array.isArray(raw)) return null
  const out: StoryAssetRef[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (!isStoryAssetRole(row.role)) continue
    if (typeof row.name !== 'string' || !row.name.trim()) continue
    out.push({
      role: row.role,
      name: row.name.trim(),
      note: typeof row.note === 'string' ? row.note : '',
    })
  }
  return out
}

/** Parse JSON tool output from save_story_asset / clear_story_assets. */
export function parseStoryAssetsToolOutput(output: unknown): StoryAssetsToolPayload | null {
  let raw: unknown = output
  if (typeof output === 'string') {
    try {
      raw = JSON.parse(output)
    } catch {
      return null
    }
  }
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (obj.ok !== true) return null
  if (obj.action !== 'save' && obj.action !== 'clear') return null
  const assets = normalizeStoryAssets(obj.story_assets)
  if (assets === null) return null
  return {
    ok: true,
    action: obj.action,
    story_assets: assets,
    message: typeof obj.message === 'string' ? obj.message : '',
  }
}

function toolNameFromPart(part: UIMessage['parts'][number]): string | null {
  if (!isToolUIPart(part)) return null
  if (part.type === 'dynamic-tool') {
    return typeof part.toolName === 'string' ? part.toolName : null
  }
  if (part.type.startsWith('tool-')) {
    return part.type.slice('tool-'.length)
  }
  return null
}

/**
 * Latest successful save/clear snapshot from assistant tool parts (scan newest first).
 */
export function latestStoryAssetsFromMessages(messages: UIMessage[]): StoryAssetRef[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (!message || message.role !== 'assistant') continue
    const parts = message.parts ?? []
    for (let j = parts.length - 1; j >= 0; j--) {
      const part = parts[j]
      if (!part || !isToolUIPart(part)) continue
      const name = toolNameFromPart(part)
      if (name !== 'save_story_asset' && name !== 'clear_story_assets') continue
      if (part.state !== 'output-available') continue
      const parsed = parseStoryAssetsToolOutput(part.output)
      if (parsed) return parsed.story_assets
    }
  }
  return []
}
