import type { UIMessage } from 'ai'

/**
 * Phrases that indicate the user asked for a weekly Instagram plan.
 * Keep aligned with `chat.quickPrompts.weeklyPlan.prompt` in messages/en.json.
 */
const WEEKLY_PLAN_REQUEST_PATTERNS = [
  /weekly instagram plan/i,
  /weekly schedule tool/i,
  /present the plan with the weekly schedule tool/i,
  /present the plan/i,
] as const

function plainTextFromMessage(message: UIMessage): string {
  return (
    message.parts
      ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('') ?? ''
  )
}

/**
 * True when the user message preceding this assistant turn looks like a weekly plan request.
 */
export function isWeeklyPlanRequest(
  visibleMessages: readonly UIMessage[],
  assistantMessageId: string,
): boolean {
  const assistantIndex = visibleMessages.findIndex((message) => message.id === assistantMessageId)
  const searchFrom = assistantIndex >= 0 ? assistantIndex - 1 : visibleMessages.length - 1

  for (let index = searchFrom; index >= 0; index -= 1) {
    const message = visibleMessages[index]
    if (!message) continue
    if (message.role !== 'user') continue

    const text = plainTextFromMessage(message)
    if (!text.trim()) continue

    return WEEKLY_PLAN_REQUEST_PATTERNS.some((pattern) => pattern.test(text))
  }

  return false
}
