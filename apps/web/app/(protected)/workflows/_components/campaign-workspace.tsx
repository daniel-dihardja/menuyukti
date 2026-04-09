'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'
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
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'

import { CampaignAssetsTab } from './campaign-assets-tab'
import { CampaignGoalEditor } from './campaign-goal-editor'
import type { TimelineMilestone } from './timeline-workspace'

const CampaignChatPanel = dynamic(
  () => import('./campaign-chat-panel').then((m) => m.CampaignChatPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[min(420px,50vh)] min-w-0 flex-1 items-center justify-center rounded-lg border border-dashed">
        <Skeleton className="h-10 w-56" />
      </div>
    ),
  },
)

const AssetsClient = dynamic(
  () => import('../../assets/assets-client').then((m) => m.AssetsClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center p-8">
        <Skeleton className="h-8 w-full max-w-md" />
      </div>
    ),
  },
)

function normalizeTab(value: string | null): 'brief' | 'assets' {
  if (value === 'assets' || value === 'brief') {
    return value
  }
  return 'brief'
}

export type CampaignWorkspaceProps = {
  workflowId: string
  locationId: number
  initialGoal: string | null
  initialMilestones: TimelineMilestone[]
}

export function CampaignWorkspace({
  workflowId,
  locationId,
  initialGoal,
  initialMilestones,
}: CampaignWorkspaceProps) {
  const t = useTranslations('analytics.campaigns.workspace')
  const [tabRaw, setTabRaw] = useQueryState('tab', parseAsString.withDefault('brief'))
  const tab = normalizeTab(tabRaw)
  const [studioOpen, setStudioOpen] = useState(false)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)

  useEffect(() => {
    if (tabRaw === 'print') {
      void setTabRaw('brief')
    }
  }, [setTabRaw, tabRaw])

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
        <div className="flex shrink-0 flex-col gap-3 border-border/60 border-b pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <TabsList className="w-full min-w-0 justify-start p-0 sm:w-auto" variant="line">
            <TabsTrigger className="flex-none px-3 py-2" value="brief">
              {t('tabBrief')}
            </TabsTrigger>
            <TabsTrigger className="flex-none px-3 py-2" value="assets">
              {t('tabAssets')}
            </TabsTrigger>
          </TabsList>
          {tab === 'brief' ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              <Button onClick={() => setStudioOpen(true)} type="button" variant="secondary">
                {t('generateVisuals')}
              </Button>
            </div>
          ) : null}
        </div>

        <TabsContent
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
          forceMount
          value="brief"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <CampaignGoalEditor initialGoal={initialGoal} workflowId={workflowId} />
            <div className="min-h-0 flex-1">
              <CampaignChatPanel
                initialMilestones={initialMilestones}
                locationId={locationId}
                workflowId={workflowId}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden" value="assets">
          <CampaignAssetsTab
            onOpenPrintShop={() => {
              setPrintDialogOpen(true)
            }}
            workflowId={workflowId}
          />
        </TabsContent>
      </Tabs>

      <Sheet onOpenChange={setStudioOpen} open={studioOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
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
              <Link href={`${routes.shop}?workflowId=${encodeURIComponent(workflowId)}`}>
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
