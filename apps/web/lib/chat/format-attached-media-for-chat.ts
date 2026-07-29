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
    'These images are also attached as vision inputs. Use these exact filenames when calling tools (for example `save_story_asset`); do not invent or truncate names.',
    ...unique.map((name, i) => `${i + 1}. ${name}`),
  ]
  return lines.join('\n')
}
