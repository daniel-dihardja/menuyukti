/**
 * Clear browser-local workflow chat state when a workflow is deleted.
 * Server checkpoints are removed by the workflow DELETE BFF.
 */

import { clearAllWorkflowChatMessages } from '@/lib/chat/workflow-chat-message-cache'

const WORKFLOW_CHAT_SESSION_STORAGE_PREFIX = 'menuyukti.wfChatSession.v1:'
const WORKFLOW_CHAT_MODE_STORAGE_PREFIX = 'menuyukti.wfChatMode.v1:'
const WORKFLOW_CHAT_IMAGE_MODEL_STORAGE_PREFIX = 'menuyukti.wfChatImageModel.v1:'

function removeStorageKey(storage: Storage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** Drop localStorage / sessionStorage keys used by workflow chat for one workflow. */
export function purgeWorkflowChatClientState(workflowId: string): void {
  if (typeof window === 'undefined') return

  clearAllWorkflowChatMessages(workflowId)

  const sessionKey = `${WORKFLOW_CHAT_SESSION_STORAGE_PREFIX}${workflowId}`
  const modeKey = `${WORKFLOW_CHAT_MODE_STORAGE_PREFIX}${workflowId}`
  const imageModelKey = `${WORKFLOW_CHAT_IMAGE_MODEL_STORAGE_PREFIX}${workflowId}`

  removeStorageKey(localStorage, sessionKey)
  removeStorageKey(sessionStorage, sessionKey)
  removeStorageKey(sessionStorage, modeKey)
  removeStorageKey(sessionStorage, imageModelKey)
}
