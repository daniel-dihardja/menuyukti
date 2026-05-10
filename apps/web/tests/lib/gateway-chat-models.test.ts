import { describe, expect, it } from 'vitest'

import {
  CHAT_GATEWAY_MODEL_IDS,
  DEFAULT_CHAT_GATEWAY_MODEL,
  gatewayModelToMessageKey,
  isAllowedChatGatewayModel,
} from '@/lib/chat/gateway-chat-models'

describe('gateway-chat-models', () => {
  it('default id is allowlisted', () => {
    expect(isAllowedChatGatewayModel(DEFAULT_CHAT_GATEWAY_MODEL)).toBe(true)
  })

  it('derives stable i18n keys for en.json chatGatewayModels.*', () => {
    expect(gatewayModelToMessageKey('openai/gpt-4.1-mini')).toBe('openai_gpt_4_1_mini')
    expect(gatewayModelToMessageKey('mistral/mistral-large-3')).toBe('mistral_mistral_large_3')
  })

  it('every listed id is allowlisted', () => {
    for (const id of CHAT_GATEWAY_MODEL_IDS) {
      expect(isAllowedChatGatewayModel(id)).toBe(true)
    }
  })
})
