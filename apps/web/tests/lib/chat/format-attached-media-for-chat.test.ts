import { describe, expect, it } from 'vitest'

import { formatAttachedMediaLibrarySection } from '@/lib/chat/format-attached-media-for-chat'

describe('formatAttachedMediaLibrarySection', () => {
  it('returns empty string for no names', () => {
    expect(formatAttachedMediaLibrarySection([])).toBe('')
    expect(formatAttachedMediaLibrarySection(['', '  '])).toBe('')
  })

  it('lists unique exact filenames for tool calls', () => {
    const name = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp'
    const out = formatAttachedMediaLibrarySection([name, name, ` ${name} `])
    expect(out).toContain('## Attached media library photos')
    expect(out).toContain('save_story_asset')
    expect(out).toContain('If this section is absent')
    expect(out).toContain(`1. ${name}`)
    expect(out.match(/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee\.webp/g)).toHaveLength(1)
  })
})
