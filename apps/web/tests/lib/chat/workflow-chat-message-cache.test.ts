import type { UIMessage } from 'ai'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  clearAllWorkflowChatMessages,
  clearWorkflowChatMessages,
  parseStoredWorkflowChatMessages,
  readWorkflowChatMessages,
  serializeWorkflowChatMessages,
  workflowChatMessagesSessionKey,
  workflowChatMessagesStorageKey,
  writeWorkflowChatMessages,
} from '@/lib/chat/workflow-chat-message-cache'

const userMsg = {
  id: 'u1',
  role: 'user',
  parts: [{ type: 'text', text: 'hello' }],
} as UIMessage

const assistantMsg = {
  id: 'a1',
  role: 'assistant',
  parts: [{ type: 'text', text: 'hi' }],
} as UIMessage

function installSessionStorageMock() {
  const store = new Map<string, string>()
  const mock = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
    get length() {
      return store.size
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
  }
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: globalThis,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: mock,
  })
  return mock
}

describe('workflowChatMessagesStorageKey', () => {
  it('uses default when session id is null', () => {
    expect(workflowChatMessagesSessionKey(null)).toBe('default')
    expect(workflowChatMessagesStorageKey('wf-1', null)).toBe(
      'menuyukti.wfChatMessages.v1:wf-1:default',
    )
  })

  it('includes session uuid when present', () => {
    const sid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    expect(workflowChatMessagesStorageKey('wf-1', sid)).toBe(
      `menuyukti.wfChatMessages.v1:wf-1:${sid}`,
    )
  })
})

describe('parseStoredWorkflowChatMessages', () => {
  it('returns empty for null, empty, or corrupt input', () => {
    expect(parseStoredWorkflowChatMessages(null)).toEqual([])
    expect(parseStoredWorkflowChatMessages('')).toEqual([])
    expect(parseStoredWorkflowChatMessages('{')).toEqual([])
    expect(parseStoredWorkflowChatMessages('"x"')).toEqual([])
  })

  it('rejects wrong version or missing messages', () => {
    expect(parseStoredWorkflowChatMessages(JSON.stringify({ v: 2, messages: [userMsg] }))).toEqual(
      [],
    )
    expect(parseStoredWorkflowChatMessages(JSON.stringify({ v: 1 }))).toEqual([])
  })

  it('filters invalid message shapes and keeps valid ones', () => {
    const raw = serializeWorkflowChatMessages([
      userMsg,
      { id: 'bad', role: 'user' } as unknown as UIMessage,
      assistantMsg,
      { role: 'assistant', parts: [] } as unknown as UIMessage,
    ])
    expect(parseStoredWorkflowChatMessages(raw)).toEqual([userMsg, assistantMsg])
  })
})

describe('sessionStorage read/write/clear', () => {
  beforeEach(() => {
    installSessionStorageMock()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage')
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('round-trips messages for a workflow session', () => {
    writeWorkflowChatMessages('wf-1', null, [userMsg, assistantMsg])
    expect(readWorkflowChatMessages('wf-1', null)).toEqual([userMsg, assistantMsg])
  })

  it('clears only the targeted session key', () => {
    const sid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    writeWorkflowChatMessages('wf-1', null, [userMsg])
    writeWorkflowChatMessages('wf-1', sid, [assistantMsg])
    clearWorkflowChatMessages('wf-1', null)
    expect(readWorkflowChatMessages('wf-1', null)).toEqual([])
    expect(readWorkflowChatMessages('wf-1', sid)).toEqual([assistantMsg])
  })

  it('clearAllWorkflowChatMessages removes every session for that workflow', () => {
    const sid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    writeWorkflowChatMessages('wf-1', null, [userMsg])
    writeWorkflowChatMessages('wf-1', sid, [assistantMsg])
    writeWorkflowChatMessages('wf-2', null, [userMsg])
    clearAllWorkflowChatMessages('wf-1')
    expect(readWorkflowChatMessages('wf-1', null)).toEqual([])
    expect(readWorkflowChatMessages('wf-1', sid)).toEqual([])
    expect(readWorkflowChatMessages('wf-2', null)).toEqual([userMsg])
  })
})
