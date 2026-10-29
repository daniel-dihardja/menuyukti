'use client'

import { PanelRight, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { ChatModeSelect } from '@/components/chat-mode-select'
import { ChatGatewayModelSelect } from '@/components/chat-gateway-model-select'
import { LeonardoPostModelSelect } from '@/components/leonardo-post-model-select'
import { useAdvisorChatKitShell } from '@/components/chat/chatkit/advisor-chatkit-shell-context'
import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Button } from '@workspace/ui/components/button'

export function AdvisorChatKitToolbar({ onClearChat }: { onClearChat: () => void }) {
  const t = useTranslations('chat')
  const tw = useTranslations('chat.workspace')
  const {
    chatMode,
    setChatMode,
    selectedChatModel,
    setSelectedChatModel,
    selectedGenerationModel,
    setSelectedGenerationModel,
    openMobileWorkspace,
  } = useAdvisorChatKitShell()
  const [clearOpen, setClearOpen] = useState(false)
  const isDesktop = useDesktopLayout()
  const isImage = chatMode === 'image_assistant'

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <ChatModeSelect onValueChange={setChatMode} value={chatMode} />
      <ChatGatewayModelSelect
        className="max-w-[min(100%,11rem)]"
        onValueChange={setSelectedChatModel}
        value={selectedChatModel}
      />
      {isImage ? (
        <LeonardoPostModelSelect
          className="max-w-[min(100%,11rem)]"
          onValueChange={setSelectedGenerationModel}
          value={selectedGenerationModel}
        />
      ) : null}
      <div className="ml-auto flex items-center gap-1">
        {isDesktop ? null : (
          <Button
            aria-label={tw('openWorkspaceAria')}
            size="icon"
            title={tw('openWorkspaceTooltip')}
            type="button"
            variant="ghost"
            onClick={openMobileWorkspace}
          >
            <PanelRight aria-hidden className="size-4" />
          </Button>
        )}
        <Button
          aria-label={t('clearChatAriaLabel')}
          size="icon"
          title={t('clearChatTooltip')}
          type="button"
          variant="ghost"
          onClick={() => setClearOpen(true)}
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      </div>
      <AlertDialog onOpenChange={setClearOpen} open={clearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clearChatConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('clearChatConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">{t('clearChatConfirmCancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onClearChat()
                setClearOpen(false)
              }}
            >
              {t('clearChatConfirmAction')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
