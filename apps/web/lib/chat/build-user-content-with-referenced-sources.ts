import { formatPresetDataMarkdownSection } from '@/lib/chat/format-payload-for-chat'

/** Merge referenced source markdown blocks with the user-visible composer text. */
export function buildUserContentWithReferencedSources(args: {
  userText: string
  sections: string[]
}): string {
  const trimmedSections = args.sections.map((s) => s.trim()).filter((s) => s.length > 0)
  if (trimmedSections.length === 0) {
    return args.userText.trim()
  }
  return `${trimmedSections.join('\n\n')}\n\n${args.userText.trim()}`
}

/** Merge referenced milestone preset markdown with the user-visible composer text. */
export function buildUserContentWithReferencedPreset(args: {
  userText: string
  milestoneTitle: string
  presetPayload: unknown
}): string {
  const presetBlock = formatPresetDataMarkdownSection(args.milestoneTitle, args.presetPayload)
  return buildUserContentWithReferencedSources({
    userText: args.userText,
    sections: [presetBlock],
  })
}
