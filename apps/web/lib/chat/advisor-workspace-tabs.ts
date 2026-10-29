export const ADVISOR_WORKSPACE_TAB_IDS = ['insights', 'story', 'venue', 'reports'] as const

export type AdvisorWorkspaceTabId = (typeof ADVISOR_WORKSPACE_TAB_IDS)[number]

export function isAdvisorWorkspaceTabId(value: string): value is AdvisorWorkspaceTabId {
  return (ADVISOR_WORKSPACE_TAB_IDS as readonly string[]).includes(value)
}

/** Default tab for general vs image_assistant chat modes. */
export function defaultAdvisorWorkspaceTab(chatMode: string): AdvisorWorkspaceTabId {
  return chatMode === 'image_assistant' ? 'story' : 'insights'
}
