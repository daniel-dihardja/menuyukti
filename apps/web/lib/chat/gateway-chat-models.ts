/**
 * Allowlisted Vercel AI Gateway model ids for workflow / advisor chat.
 *
 * Keep in sync with apps/agents/agents/core/chat/allowed_models.py (CHAT_GATEWAY_MODEL_ALLOWLIST).
 * Verified against https://ai-gateway.vercel.sh/v1/models (May 2026).
 */
export const DEFAULT_CHAT_GATEWAY_MODEL = 'openai/gpt-5.4' as const

export const CHAT_GATEWAY_MODEL_IDS = [
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'openai/gpt-5.4',
  'openai/gpt-4.1-mini',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-opus-4.6',
  'google/gemini-2.5-flash',
  'xai/grok-3',
  'mistral/mistral-large-3',
] as const

export type ChatGatewayModelId = (typeof CHAT_GATEWAY_MODEL_IDS)[number]

/**
 * Vision-capable gateway models for style draft-from-image (and similar multimodal flows).
 * Subset of CHAT_GATEWAY_MODEL_IDS. Keep in sync with
 * apps/agents/agents/core/chat/allowed_models.py (VISION_GATEWAY_MODEL_ALLOWLIST).
 */
export const DEFAULT_VISION_GATEWAY_MODEL = 'openai/gpt-5.4' as const

export const VISION_GATEWAY_MODEL_IDS = [
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'openai/gpt-5.4',
  'openai/gpt-4.1-mini',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-opus-4.6',
  'google/gemini-2.5-flash',
] as const satisfies readonly ChatGatewayModelId[]

export type VisionGatewayModelId = (typeof VISION_GATEWAY_MODEL_IDS)[number]

export function gatewayModelToMessageKey(id: string): string {
  return id.replace(/[^a-zA-Z0-9]+/g, '_')
}

export function isAllowedChatGatewayModel(id: string): id is ChatGatewayModelId {
  return (CHAT_GATEWAY_MODEL_IDS as readonly string[]).includes(id)
}

export function isAllowedVisionGatewayModel(id: string): id is VisionGatewayModelId {
  return (VISION_GATEWAY_MODEL_IDS as readonly string[]).includes(id)
}
