'use client'

import { WorkflowChatComposer } from './workflow-chat-composer'
import { WorkflowChatMessageList } from './workflow-chat-message-list'

export function WorkflowChatPane() {
  return (
    <>
      <WorkflowChatMessageList />
      <WorkflowChatComposer />
    </>
  )
}
