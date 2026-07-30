import type { UIMessage } from 'ai'

import { normalizeGeneratedImageToolOutputsInMessages } from '@/lib/chat/refresh-generated-image-urls'

const AGENT_CHAT_MESSAGES_STORAGE_PREFIX = 'menuyukti.agentChatMessages.v1:'
const CACHE_VERSION = 1

const UI_MESSAGE_ROLES = new Set(['system', 'user', 'assistant'])

export function agentChatMessagesStorageKey(agentThreadId: string): string {
  return `${AGENT_CHAT_MESSAGES_STORAGE_PREFIX}${agentThreadId}`
}

function isUiMessage(value: unknown): value is UIMessage {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || !row.id) return false
  if (typeof row.role !== 'string' || !UI_MESSAGE_ROLES.has(row.role)) return false
  if (!Array.isArray(row.parts)) return false
  return true
}

export function parseStoredAgentChatMessages(raw: string | null): UIMessage[] {
  if (raw === null || raw === '') return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return []
    const obj = parsed as Record<string, unknown>
    if (obj.v !== CACHE_VERSION) return []
    if (!Array.isArray(obj.messages)) return []
    const out: UIMessage[] = []
    for (const item of obj.messages) {
      if (isUiMessage(item)) {
        out.push(item)
      }
    }
    return out
  } catch {
    return []
  }
}

export function serializeAgentChatMessages(messages: UIMessage[]): string {
  const normalized = normalizeGeneratedImageToolOutputsInMessages(messages)
  return JSON.stringify({ v: CACHE_VERSION, messages: normalized })
}

export function readAgentChatMessages(agentThreadId: string): UIMessage[] {
  if (typeof window === 'undefined') return []
  try {
    return parseStoredAgentChatMessages(
      sessionStorage.getItem(agentChatMessagesStorageKey(agentThreadId)),
    )
  } catch {
    return []
  }
}

export function writeAgentChatMessages(agentThreadId: string, messages: UIMessage[]): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      agentChatMessagesStorageKey(agentThreadId),
      serializeAgentChatMessages(messages),
    )
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAgentChatMessages(agentThreadId: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(agentChatMessagesStorageKey(agentThreadId))
  } catch {
    /* ignore */
  }
}
