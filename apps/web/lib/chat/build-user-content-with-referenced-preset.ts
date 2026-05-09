import { formatPresetDataMarkdownSection } from '@/lib/chat/format-payload-for-chat'

/** Merge referenced milestone preset markdown with the user-visible composer text. */
export function buildUserContentWithReferencedPreset(args: {
  userText: string
  milestoneTitle: string
  presetPayload: unknown
}): string {
  const presetBlock = formatPresetDataMarkdownSection(args.milestoneTitle, args.presetPayload)
  return `${presetBlock}\n\n${args.userText.trim()}`
}
