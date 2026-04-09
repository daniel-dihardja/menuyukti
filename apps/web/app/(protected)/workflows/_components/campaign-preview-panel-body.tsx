'use client'

import { useTranslations } from 'next-intl'

import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'

export function CampaignPreviewPanelBody() {
  const tWorkspace = useTranslations('analytics.campaigns.workspace')

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden border-dashed">
      <CardHeader className="shrink-0">
        <CardTitle className="text-base">{tWorkspace('previewTitle')}</CardTitle>
        <CardDescription className="text-pretty">
          {tWorkspace('previewDescription')}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
