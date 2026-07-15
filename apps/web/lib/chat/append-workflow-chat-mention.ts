/** Insert a workflow chat @-reference into the composer, replacing an in-progress `@` trigger. */
export function appendWorkflowChatMention(current: string, label: string): string {
  const normalized = label.replace(/\s+/g, ' ').trim()
  const mention = normalized.startsWith('@') ? normalized : `@${normalized}`

  // Mention menu is start-anchored (`value.startsWith('@')`); replace the trigger, do not append.
  if (current.startsWith('@')) {
    return `${mention} `
  }

  const prefix = current.length > 0 && !current.endsWith(' ') ? `${current} ` : current
  return `${prefix}${mention} `
}
