import type { UIMessage } from 'ai'

import { normalizeGeneratedImageToolOutputsInMessages } from '@/lib/chat/refresh-generated-image-urls'

const WORKFLOW_CHAT_MESSAGES_STORAGE_PREFIX = 'menuyukti.wfChatMessages.v1:'
const CACHE_VERSION = 1
const DEFAULT_SESSION_KEY = 'default'

const UI_MESSAGE_ROLES = new Set(['system', 'user', 'assistant'])

export function workflowChatMessagesSessionKey(sessionId: string | null): string {
  return sessionId !== null && sessionId.length > 0 ? sessionId : DEFAULT_SESSION_KEY
}

export function workflowChatMessagesStorageKey(
  workflowId: string,
  sessionId: string | null,
): string {
  return `${WORKFLOW_CHAT_MESSAGES_STORAGE_PREFIX}${workflowId}:${workflowChatMessagesSessionKey(sessionId)}`
}

function isUiMessage(value: unknown): value is UIMessage {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || !row.id) return false
  if (typeof row.role !== 'string' || !UI_MESSAGE_ROLES.has(row.role)) return false
  if (!Array.isArray(row.parts)) return false
  return true
}

/** Parse stored JSON; corrupt / wrong version / missing → []. */
export function parseStoredWorkflowChatMessages(raw: string | null): UIMessage[] {
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

export function serializeWorkflowChatMessages(messages: UIMessage[]): string {
  const normalized = normalizeGeneratedImageToolOutputsInMessages(messages)
  return JSON.stringify({ v: CACHE_VERSION, messages: normalized })
}

export function readWorkflowChatMessages(
  workflowId: string,
  sessionId: string | null,
): UIMessage[] {
  if (typeof window === 'undefined') return []
  try {
    return parseStoredWorkflowChatMessages(
      sessionStorage.getItem(workflowChatMessagesStorageKey(workflowId, sessionId)),
    )
  } catch {
    return []
  }
}

export function writeWorkflowChatMessages(
  workflowId: string,
  sessionId: string | null,
  messages: UIMessage[],
): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      workflowChatMessagesStorageKey(workflowId, sessionId),
      serializeWorkflowChatMessages(messages),
    )
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearWorkflowChatMessages(workflowId: string, sessionId: string | null): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(workflowChatMessagesStorageKey(workflowId, sessionId))
  } catch {
    /* ignore */
  }
}

/** Remove all sessionStorage message caches for a workflow (any session key). */
export function clearAllWorkflowChatMessages(workflowId: string): void {
  if (typeof window === 'undefined') return
  const prefix = `${WORKFLOW_CHAT_MESSAGES_STORAGE_PREFIX}${workflowId}:`
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key !== null && key.startsWith(prefix)) {
        keys.push(key)
      }
    }
    for (const key of keys) {
      sessionStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
}
