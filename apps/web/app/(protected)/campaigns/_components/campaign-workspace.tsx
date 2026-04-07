'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { parseAsString, useQueryState } from 'nuqs'

import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'

import { AssetsClient } from '../../assets/assets-client'
import { CampaignAssetsTab } from './campaign-assets-tab'
import { CampaignChatPanel } from './campaign-chat-panel'
import type { TimelineMilestone } from './timeline-workspace'

function normalizeTab(value: string | null): 'brief' | 'assets' | 'print' {
  if (value === 'assets' || value === 'print' || value === 'brief') {
    return value
  }
  return 'brief'
}

export type CampaignWorkspaceProps = {
  campaignId: string
  locationId: number
  initialMilestones: TimelineMilestone[]
}

export function CampaignWorkspace({
  campaignId,
  locationId,
  initialMilestones,
}: CampaignWorkspaceProps) {
  const t = useTranslations('analytics.campaigns.workspace')
  const [tabRaw, setTabRaw] = useQueryState('tab', parseAsString.withDefault('brief'))
  const tab = normalizeTab(tabRaw)
  const [studioOpen, setStudioOpen] = useState(false)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)

  const handleTabChange = useCallback(
    (value: string) => {
      void setTabRaw(normalizeTab(value))
    },
    [setTabRaw],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Tabs
        className="flex min-h-0 flex-1 flex-col gap-3"
        onValueChange={handleTabChange}
        value={tab}
      >
        <TabsList className="w-full min-w-0 shrink-0 justify-start sm:w-auto">
          <TabsTrigger value="brief">{t('tabBrief')}</TabsTrigger>
          <TabsTrigger value="assets">{t('tabAssets')}</TabsTrigger>
          <TabsTrigger value="print">{t('tabPrint')}</TabsTrigger>
        </TabsList>

        <TabsContent
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
          forceMount
          value="brief"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button onClick={() => setStudioOpen(true)} type="button" variant="default">
                {t('generateVisuals')}
              </Button>
              <Button
                onClick={() => {
                  void setTabRaw('print')
                  setPrintDialogOpen(true)
                }}
                type="button"
                variant="outline"
              >
                {t('orderPrints')}
              </Button>
            </div>
            <div className="min-h-0 flex-1">
              <CampaignChatPanel
                campaignId={campaignId}
                initialMilestones={initialMilestones}
                locationId={locationId}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden" value="assets">
          <CampaignAssetsTab
            campaignId={campaignId}
            onOpenPrintShop={() => {
              void setTabRaw('print')
              setPrintDialogOpen(true)
            }}
          />
        </TabsContent>

        <TabsContent className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden" value="print">
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-6">
            <div>
              <h3 className="font-medium text-lg">{t('printDialogTitle')}</h3>
              <p className="mt-1 text-muted-foreground text-sm text-pretty">
                {t('printDialogDescription')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`${routes.shop}?campaignId=${encodeURIComponent(campaignId)}`}>
                  {t('openPrintShop')}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={routes.printOrders}>{t('viewPrintOrders')}</Link>
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Sheet onOpenChange={setStudioOpen} open={studioOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle>{t('studioSheetTitle')}</SheetTitle>
            <SheetDescription>{t('studioSheetDescription')}</SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1 px-4 py-4">
            <AssetsClient />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog onOpenChange={setPrintDialogOpen} open={printDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('printDialogTitle')}</DialogTitle>
            <DialogDescription>{t('printDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button asChild>
              <Link href={`${routes.shop}?campaignId=${encodeURIComponent(campaignId)}`}>
                {t('openPrintShop')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={routes.printOrders}>{t('viewPrintOrders')}</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
