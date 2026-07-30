/** Markdown section listing media-library photo filenames attached to a chat turn. */

/**
 * Build a text block so the LLM can see exact media-library filenames for tool calls
 * (e.g. ``save_story_asset``). Vision attachments alone do not include filenames.
 */
export function formatAttachedMediaLibrarySection(names: string[]): string {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))]
  if (unique.length === 0) return ''

  const lines = [
    '## Attached media library photos',
    'These images are also attached as vision inputs. Call `save_story_asset` only with these exact filenames when labeling style/content; do not invent, guess, or truncate names. If this section is absent, do not call `save_story_asset`.',
    ...unique.map((name, i) => `${i + 1}. ${name}`),
  ]
  return lines.join('\n')
}
