import { describe, expect, it } from 'vitest'

import { formatAttachedMediaLibrarySection } from '@/lib/chat/format-attached-media-for-chat'
import { formatPresetDataMarkdownSection } from '@/lib/chat/format-payload-for-chat'
import { stripLlmOnlyChatSections } from '@/lib/chat/strip-llm-only-chat-sections'

describe('stripLlmOnlyChatSections', () => {
  it('returns empty for blank input', () => {
    expect(stripLlmOnlyChatSections('')).toEqual({ text: '', attachedMediaNames: [] })
    expect(stripLlmOnlyChatSections('   ')).toEqual({ text: '', attachedMediaNames: [] })
  })

  it('keeps plain user text unchanged', () => {
    expect(stripLlmOnlyChatSections('Hello @Brief')).toEqual({
      text: 'Hello @Brief',
      attachedMediaNames: [],
    })
  })

  it('strips attached media section and returns filenames', () => {
    const name = 'f72bd586-2e75-4017-8e23-0db2bb1c3781.png'
    const section = formatAttachedMediaLibrarySection([name])
    const combined = `${section}\n\nPlease label style`
    expect(stripLlmOnlyChatSections(combined)).toEqual({
      text: 'Please label style',
      attachedMediaNames: [name],
    })
  })

  it('strips preset and visualization sections', () => {
    const preset = formatPresetDataMarkdownSection('Brief', { goal: 'x' })
    const combined = `${preset}\n\n## Visualization data — Heatmap\n{}\n\nGo`
    expect(stripLlmOnlyChatSections(combined)).toEqual({
      text: 'Go',
      attachedMediaNames: [],
    })
  })

  it('handles attachment-only turns', () => {
    const name = 'a.webp'
    const section = formatAttachedMediaLibrarySection([name])
    expect(stripLlmOnlyChatSections(section)).toEqual({
      text: '',
      attachedMediaNames: [name],
    })
  })
})
