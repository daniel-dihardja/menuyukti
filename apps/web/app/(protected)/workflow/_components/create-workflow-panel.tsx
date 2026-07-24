'use client'

import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { FieldGroup } from '@workspace/ui/components/field'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'

import { LocationSelect } from '../../analytics/sales/location-select'

type Branch = {
  id: number
  name: string
  nodeId: string | null
}

type AnalyticsRunItem = {
  id: number
  name: string
}

type LocationSectionProps = {
  branches: Branch[]
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
      {children}
    </span>
  )
}

function CreateWorkflowLocationSection({ branches }: LocationSectionProps) {
  const t = useTranslations('analytics.workflows')
  const tPanel = useTranslations('analytics.workflows.createWorkflowPanel')

  return (
    <LocationSelect
      branches={branches}
      className="w-full max-w-none"
      id="workflow-location-select"
      label={tPanel('sectionLocation')}
      placeholder={branches.length > 1 ? t('branchPlaceholder') : t('branchLabel')}
    />
  )
}

type DataSectionProps = {
  analyticsRuns: AnalyticsRunItem[]
  loadingRuns: boolean
  runsError: string | null
  analyticsRunId: number | null
  onAnalyticsRunIdChange: (id: number | null) => void
}

function CreateWorkflowDataSection({
  analyticsRuns,
  loadingRuns,
  runsError,
  analyticsRunId,
  onAnalyticsRunIdChange,
}: DataSectionProps) {
  const t = useTranslations('analytics.workflows')
  const tPanel = useTranslations('analytics.workflows.createWorkflowPanel')

  return (
    <>
      <Separator className="bg-border/80" />

      <div className="flex min-w-0 max-w-md flex-col gap-2">
        <SectionLabel>{tPanel('sectionData')}</SectionLabel>
        {loadingRuns ? (
          <Skeleton className="h-10 w-full" />
        ) : runsError ? (
          <p className="text-destructive text-sm leading-snug" role="status">
            {runsError}
          </p>
        ) : analyticsRuns.length === 0 ? (
          <p
            className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-muted-foreground text-sm leading-snug"
            id="workflow-analytics-run-empty"
          >
            {t('analyticsRunNone')}
          </p>
        ) : (
          <Select
            onValueChange={(val) => onAnalyticsRunIdChange(val ? Number(val) : null)}
            value={analyticsRunId !== null ? String(analyticsRunId) : undefined}
          >
            <SelectTrigger
              aria-label={t('analyticsRunLabel')}
              className="h-10 w-full min-w-0"
              id="workflow-analytics-run-select"
            >
              <SelectValue placeholder={t('analyticsRunPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {analyticsRuns.map((run) => (
                <SelectItem key={run.id} value={String(run.id)}>
                  {run.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </>
  )
}

type FooterSectionProps = {
  canCreate: boolean
  creating: boolean
  createError: string | null
  onCreate: () => void | Promise<void>
}

function CreateWorkflowFooterSection({
  canCreate,
  creating,
  createError,
  onCreate,
}: FooterSectionProps) {
  const tPanel = useTranslations('analytics.workflows.createWorkflowPanel')
  const tNew = useTranslations('analytics.workflows.newWorkflowDialog')

  return (
    <>
      <Separator className="bg-border/80" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="max-w-md text-muted-foreground text-sm leading-relaxed">
            {tPanel('footerHint')}
          </p>
          <Button
            className="h-11 min-w-[11rem] shrink-0 px-6 font-medium"
            disabled={!canCreate || creating}
            onClick={() => void onCreate()}
            size="lg"
            type="button"
          >
            {creating ? (
              <>
                <Spinner data-icon="inline-start" />
                {tNew('creating')}
              </>
            ) : (
              <>
                {tPanel('ctaPrimary')}
                <ArrowRight aria-hidden data-icon="inline-end" />
              </>
            )}
          </Button>
        </div>
        {createError ? (
          <Alert variant="destructive">
            <AlertDescription>{createError}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </>
  )
}

export type CreateWorkflowPanelProps = {
  branches: Branch[]
  analyticsRuns: AnalyticsRunItem[]
  loadingRuns: boolean
  runsError: string | null
  analyticsRunId: number | null
  onAnalyticsRunIdChange: (id: number | null) => void
  onCreate: () => void | Promise<void>
  canCreate: boolean
  creating: boolean
  createError: string | null
  hasSelectedLocation: boolean
}

export function CreateWorkflowPanel({
  branches,
  analyticsRuns,
  loadingRuns,
  runsError,
  analyticsRunId,
  onAnalyticsRunIdChange,
  onCreate,
  canCreate,
  creating,
  createError,
  hasSelectedLocation,
}: CreateWorkflowPanelProps) {
  const tPanel = useTranslations('analytics.workflows.createWorkflowPanel')

  return (
    <Card className="overflow-hidden bg-card shadow-none">
      <CardHeader className="border-border/60 border-b bg-muted/20 px-5 py-5 sm:px-6">
        <CardTitle className="text-balance font-semibold text-xl tracking-tight">
          {tPanel('title')}
        </CardTitle>
        <CardDescription className="text-pretty text-base leading-relaxed">
          {tPanel('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-5 py-6 sm:px-6">
        <FieldGroup className="gap-6">
          <CreateWorkflowLocationSection branches={branches} />

          {hasSelectedLocation ? (
            <>
              <CreateWorkflowDataSection
                analyticsRunId={analyticsRunId}
                analyticsRuns={analyticsRuns}
                loadingRuns={loadingRuns}
                onAnalyticsRunIdChange={onAnalyticsRunIdChange}
                runsError={runsError}
              />
              <CreateWorkflowFooterSection
                canCreate={canCreate}
                createError={createError}
                creating={creating}
                onCreate={onCreate}
              />
            </>
          ) : null}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
