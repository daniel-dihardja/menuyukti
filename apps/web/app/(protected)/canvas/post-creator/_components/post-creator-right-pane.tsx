'use client'

import { useTranslations } from 'next-intl'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'

import { POST_IMAGE_HEIGHT, POST_IMAGE_WIDTH } from './post-creator-constants'
import { PostCreatorPromptPane } from './post-creator-prompt-pane'

export function PostCreatorRightPane() {
  const tTabs = useTranslations('postCreator.tabs')
  const tSettings = useTranslations('postCreator.settings')
  const tPreview = useTranslations('postCreator.preview')
  const tPane = useTranslations('postCreator')

  const formatLabel = tPreview('formatLabel')
  const dimensions = tPreview('dimensions', {
    width: POST_IMAGE_WIDTH,
    height: POST_IMAGE_HEIGHT,
  })

  return (
    <section
      aria-label={tPane('promptPane')}
      className="flex h-full min-h-0 flex-col overflow-hidden"
    >
      <Tabs defaultValue="prompt" className="flex h-full min-h-0 flex-col">
        <TabsList className="mx-4 mt-4 w-[calc(100%-2rem)] shrink-0 justify-start">
          <TabsTrigger value="prompt">{tTabs('prompt')}</TabsTrigger>
          <TabsTrigger value="settings">{tTabs('settings')}</TabsTrigger>
        </TabsList>
        <TabsContent
          value="prompt"
          className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
        >
          <PostCreatorPromptPane />
        </TabsContent>
        <TabsContent
          value="settings"
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 data-[state=inactive]:hidden"
        >
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium">{tSettings('title')}</h3>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">{tSettings('format')}</dt>
                <dd className="font-medium">
                  {formatLabel} · {dimensions}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">{tSettings('model')}</dt>
                <dd className="font-medium">{tSettings('modelValue')}</dd>
              </div>
            </dl>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
