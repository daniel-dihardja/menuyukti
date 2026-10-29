'use client'

import { useTranslations } from 'next-intl'

import UploadExcelClient from '@/app/(protected)/analytics/sales/upload-xcel-client'
import { useDeleteAnalytics } from '@/app/(protected)/analytics/sales/use-delete-analytics'
import { useUploadAnalytics } from '@/app/(protected)/analytics/sales/use-upload-analytics'
import { useAnalyticsList } from '@/hooks/use-analytics-list'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

type Props = {
  locationId: number
  activeAnalyticsRunId: number | null
  onActivateRun: (analyticsRunId: number | null) => void
}

export function AdvisorWorkspaceReportsTab({
  locationId,
  activeAnalyticsRunId,
  onActivateRun,
}: Props) {
  const t = useTranslations('chat.workspace')
  const salesReportsEnabled = isFeatureEnabled('salesReports')
  const { runs, isLoading, mutate } = useAnalyticsList(locationId)
  const { uploadFile, uploading, status, message, pos } = useUploadAnalytics(locationId, () => {
    void mutate()
  })
  const { deleteAnalytics, deleting } = useDeleteAnalytics({
    locationId,
    onSuccess: () => {
      void mutate()
    },
  })

  if (!salesReportsEnabled) {
    return (
      <div className="p-3">
        <p className="text-muted-foreground text-sm">{t('reportsDisabled')}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
      <UploadExcelClient
        disabled={!locationId}
        uploading={uploading}
        status={status}
        message={message}
        pos={pos}
        onFileSelected={uploadFile}
      />

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : runs.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('reportsEmpty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reportsNameColumn')}</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap text-right">
                {t('reportsActionsColumn')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => {
              const isActive = activeAnalyticsRunId === run.id
              return (
                <TableRow key={run.id}>
                  <TableCell className="max-w-[12rem] truncate font-medium" title={run.name}>
                    {run.name}
                    {isActive ? (
                      <span className="ml-2 text-muted-foreground text-xs">
                        {t('reportsActive')}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={isActive ? 'secondary' : 'outline'}
                        disabled={isActive}
                        onClick={() => onActivateRun(run.id)}
                      >
                        {isActive ? t('reportsInChat') : t('reportsUseInChat')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={deleting}
                        onClick={() => {
                          void deleteAnalytics(run.id).then((result) => {
                            if (result.ok && activeAnalyticsRunId === run.id) {
                              onActivateRun(null)
                            }
                          })
                        }}
                      >
                        {t('reportsDelete')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
