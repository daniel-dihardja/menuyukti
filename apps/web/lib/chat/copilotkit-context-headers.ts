/**
 * Advisor shell context headers forwarded browser → Copilot Runtime → agents.
 * Identity (`X-Menuyukti-User-Id`) is NEVER in this list — the BFF stamps it server-side.
 */

export const COPILOTKIT_CONTEXT_HEADER_NAMES = [
  'x-menuyukti-agent-thread-id',
  'x-menuyukti-location-id',
  'x-menuyukti-analytics-run-id',
  'x-menuyukti-chat-mode',
  'x-menuyukti-chat-model',
  'x-menuyukti-generation-model',
  'x-menuyukti-image-format',
  'x-menuyukti-image-quality',
] as const

export type CopilotKitContextHeaderName = (typeof COPILOTKIT_CONTEXT_HEADER_NAMES)[number]

export function buildAdvisorCopilotKitContextHeaders(shell: {
  agentThreadId: string
  locationId: number
  analyticsRunId: number | null
  chatMode: string
  selectedChatModel?: string
  selectedGenerationModel?: string
  selectedImageFormat?: string
  selectedImageQuality?: string
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Menuyukti-Agent-Thread-Id': shell.agentThreadId,
    'X-Menuyukti-Location-Id': String(shell.locationId),
    'X-Menuyukti-Chat-Mode': shell.chatMode,
  }
  if (shell.analyticsRunId != null) {
    headers['X-Menuyukti-Analytics-Run-Id'] = String(shell.analyticsRunId)
  }
  if (shell.selectedChatModel) {
    headers['X-Menuyukti-Chat-Model'] = shell.selectedChatModel
  }
  if (shell.selectedGenerationModel) {
    headers['X-Menuyukti-Generation-Model'] = shell.selectedGenerationModel
  }
  if (shell.selectedImageFormat) {
    headers['X-Menuyukti-Image-Format'] = shell.selectedImageFormat
  }
  if (shell.selectedImageQuality) {
    headers['X-Menuyukti-Image-Quality'] = shell.selectedImageQuality
  }
  return headers
}
