import { isToolUIPart, type UIMessage } from 'ai'

export type StoryAssetRole = 'style' | 'content' | 'result'

export type StoryAssetRef = {
  role: StoryAssetRole
  name: string
  note: string
}

export type StoryAssetsToolPayload = {
  ok: boolean
  action: 'save' | 'clear' | 'save_result'
  story_assets: StoryAssetRef[]
  message: string
}

function isStoryAssetRole(value: unknown): value is StoryAssetRole {
  return value === 'style' || value === 'content' || value === 'result'
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

function parseJsonObject(output: unknown): Record<string, unknown> | null {
  let raw: unknown = output
  if (typeof output === 'string') {
    try {
      raw = JSON.parse(output)
    } catch {
      return null
    }
  }
  if (!raw || typeof raw !== 'object') return null
  return raw as Record<string, unknown>
}

/** Parse JSON tool output from save_story_asset / clear_story_assets. */
export function parseStoryAssetsToolOutput(output: unknown): StoryAssetsToolPayload | null {
  const obj = parseJsonObject(output)
  if (!obj) return null
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

/**
 * True when save_story_asset rejected the call (e.g. invented filename).
 * Used to hide the red error chip — the model still sees the tool result.
 */
export function isRejectedStoryAssetSaveOutput(output: unknown): boolean {
  const obj = parseJsonObject(output)
  if (!obj) return false
  return obj.ok === false && obj.action === 'save'
}

/**
 * Parse generate_instagram_post_image output that embeds a story_assets snapshot
 * (Story mode save_result).
 */
export function parseGenerateStoryAssetsOutput(output: unknown): StoryAssetRef[] | null {
  const obj = parseJsonObject(output)
  if (!obj) return null
  if (typeof obj.url !== 'string' || !obj.url) return null
  if (obj.action === 'save_result' || Array.isArray(obj.story_assets)) {
    return normalizeStoryAssets(obj.story_assets)
  }
  return null
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

const STORY_ASSET_SNAPSHOT_TOOLS = new Set([
  'save_story_asset',
  'clear_story_assets',
  'generate_instagram_post_image',
])

/**
 * Latest successful save/clear/generate snapshot from assistant tool parts (scan newest first).
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
      if (!name || !STORY_ASSET_SNAPSHOT_TOOLS.has(name)) continue
      if (part.state !== 'output-available') continue
      if (name === 'generate_instagram_post_image') {
        const fromGenerate = parseGenerateStoryAssetsOutput(part.output)
        if (fromGenerate) return fromGenerate
        continue
      }
      const parsed = parseStoryAssetsToolOutput(part.output)
      if (parsed) return parsed.story_assets
    }
  }
  return []
}

/**
 * Snapshot of story assets as of a given message (inclusive).
 * Returns [] when ``messageId`` is not found.
 */
export function storyAssetsAsOfMessage(
  messages: readonly UIMessage[],
  messageId: string,
): StoryAssetRef[] {
  const end = messages.findIndex((m) => m.id === messageId)
  if (end < 0) return []
  return latestStoryAssetsFromMessages(messages.slice(0, end + 1) as UIMessage[])
}

/** Style and content refs for Phase 3 confirmation previews (excludes result). */
export function styleAndContentStoryAssets(assets: readonly StoryAssetRef[]): StoryAssetRef[] {
  return assets.filter((a) => a.role === 'style' || a.role === 'content')
}

/**
 * Thumbnail URL for a Result chip: latest generate tool output whose ``name`` matches.
 */
export function resultThumbnailUrlFromMessages(
  messages: UIMessage[],
  resultName: string,
): string | null {
  const trimmed = resultName.trim()
  if (!trimmed) return null

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (!message || message.role !== 'assistant') continue
    const parts = message.parts ?? []
    for (let j = parts.length - 1; j >= 0; j--) {
      const part = parts[j]
      if (!part || !isToolUIPart(part)) continue
      if (toolNameFromPart(part) !== 'generate_instagram_post_image') continue
      if (part.state !== 'output-available') continue
      const obj = parseJsonObject(part.output)
      if (!obj) continue
      if (typeof obj.name !== 'string' || obj.name.trim() !== trimmed) continue
      if (typeof obj.url === 'string' && obj.url) return obj.url
    }
  }
  return null
}
