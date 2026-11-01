import { describe, expect, it } from 'vitest'

import {
  buildAdvisorCopilotKitContextHeaders,
  COPILOTKIT_CONTEXT_HEADER_NAMES,
} from '@/lib/chat/copilotkit-context-headers'

describe('buildAdvisorCopilotKitContextHeaders', () => {
  it('never includes user identity headers', () => {
    const headers = buildAdvisorCopilotKitContextHeaders({
      agentThreadId: 't1',
      locationId: 9,
      analyticsRunId: 3,
      chatMode: 'general',
      selectedChatModel: 'openai/gpt-5.4',
    })
    const keys = Object.keys(headers).map((k) => k.toLowerCase())
    expect(keys).not.toContain('x-menuyukti-user-id')
    expect(keys).not.toContain('x-internal-api-key')
    expect(headers['X-Menuyukti-Agent-Thread-Id']).toBe('t1')
    expect(headers['X-Menuyukti-Location-Id']).toBe('9')
    expect(headers['X-Menuyukti-Analytics-Run-Id']).toBe('3')
  })

  it('allowlist matches builder output keys (case-insensitive)', () => {
    const headers = buildAdvisorCopilotKitContextHeaders({
      agentThreadId: 't1',
      locationId: 1,
      analyticsRunId: null,
      chatMode: 'inventar',
    })
    for (const key of Object.keys(headers)) {
      expect(COPILOTKIT_CONTEXT_HEADER_NAMES).toContain(key.toLowerCase())
    }
  })
})
