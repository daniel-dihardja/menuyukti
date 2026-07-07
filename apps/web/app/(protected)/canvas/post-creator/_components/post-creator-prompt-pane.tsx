'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId } from 'react'

import { Button } from '@workspace/ui/components/button'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Textarea } from '@workspace/ui/components/textarea'

export type PostCreatorPromptPaneProps = {
  prompt: string
  onPromptChange: (value: string) => void
  onSubmit: () => void
  isGenerating: boolean
  disabled?: boolean
}

export function PostCreatorPromptPane({
  prompt,
  onPromptChange,
  onSubmit,
  isGenerating,
  disabled = false,
}: PostCreatorPromptPaneProps) {
  const t = useTranslations('postCreator.prompt')
  const tPane = useTranslations('postCreator')
  const promptId = useId()
  const canSubmit = prompt.trim().length > 0 && !isGenerating && !disabled

  return (
    <section
      aria-label={tPane('promptPane')}
      className="flex h-full min-h-0 flex-col overflow-hidden p-4"
    >
      <form
        className="flex min-h-0 flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) onSubmit()
        }}
      >
        <Field className="gap-1.5">
          <FieldLabel htmlFor={promptId}>{t('label')}</FieldLabel>
          <Textarea
            id={promptId}
            className="min-h-[160px] resize-y"
            disabled={disabled || isGenerating}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={t('placeholder')}
            value={prompt}
          />
        </Field>
        <Button className="w-full shrink-0" disabled={!canSubmit} type="submit">
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              {t('generating')}
            </>
          ) : (
            <>
              <Sparkles data-icon="inline-start" />
              {t('generate')}
            </>
          )}
        </Button>
      </form>
    </section>
  )
}
