/** Shared chat UI types (composer / context). */

export type { PendingMediaAttachment } from '@/lib/chat/chat-media-mention'

export type ChatSlashCommand = {
  id: string
  label: string
  description: string
}
