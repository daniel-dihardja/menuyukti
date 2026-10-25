'use client'

import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { ChatModeSelect } from '@/components/chat-mode-select'
import { ChatGatewayModelSelect } from '@/components/chat-gateway-model-select'
import { LeonardoPostModelSelect } from '@/components/leonardo-post-model-select'
import { ChatSalesReportSelect } from '@/components/chat/chat-sales-report-select'
import { useAdvisorChatKitShell } from '@/components/chat/chatkit/advisor-chatkit-shell-context'
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
  const {
    chatMode,
    setChatMode,
    selectedChatModel,
    setSelectedChatModel,
    selectedGenerationModel,
    setSelectedGenerationModel,
    locationId,
    analyticsRunId,
    setAnalyticsRunId,
  } = useAdvisorChatKitShell()
  const [clearOpen, setClearOpen] = useState(false)
  const isImage = chatMode === 'image_assistant'

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <ChatModeSelect onValueChange={setChatMode} value={chatMode} />
      {chatMode === 'general' ? (
        <ChatSalesReportSelect
          locationId={locationId}
          onValueChange={setAnalyticsRunId}
          value={analyticsRunId}
        />
      ) : null}
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
      <div className="ml-auto">
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
