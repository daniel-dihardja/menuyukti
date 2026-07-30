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
