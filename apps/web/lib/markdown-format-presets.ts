/** Preset ids for POST /api/format-markdown (must match agents `agents/core/format_markdown/presets.py`). */

export const MARKDOWN_FORMAT_PRESETS = ['milestone-data'] as const

export type MarkdownFormatPreset = (typeof MARKDOWN_FORMAT_PRESETS)[number]

export function isMarkdownFormatPreset(value: string): value is MarkdownFormatPreset {
  return (MARKDOWN_FORMAT_PRESETS as readonly string[]).includes(value)
}
