'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { DAILY_HEATMAP_END_HOUR, DAILY_HEATMAP_START_HOUR } from '@/lib/heatmap-config'
import { HeatmapMatrix } from './heatmap-matrix'
import type { HeatmapMatrixResult } from './heatmap.adapters'

type HeatmapViewProps = {
  dailyMatrix: HeatmapMatrixResult
  weeklyMatrix: HeatmapMatrixResult
}

export function HeatmapView({ dailyMatrix, weeklyMatrix }: HeatmapViewProps) {
  const t = useTranslations('analytics.heatmap')
  const [view, setView] = useState<'daily' | 'weekly'>('daily')

  const dailyEmpty = dailyMatrix.rows.length === 0
  const weeklyEmpty = weeklyMatrix.rows.length === 0

  if (dailyEmpty && weeklyEmpty) {
    return <p className="text-sm text-muted-foreground">No heatmap data for this run.</p>
  }

  const dailyTitle = t('dailyTitle', {
    startHour: DAILY_HEATMAP_START_HOUR,
    endHour: DAILY_HEATMAP_END_HOUR,
  })
  const weeklyTitle = t('weeklyTitle')

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as 'daily' | 'weekly')}>
        <TabsList>
          <TabsTrigger value="daily">{t('tabs.daily')}</TabsTrigger>
          <TabsTrigger value="weekly">{t('tabs.weekly')}</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-4">
          {dailyEmpty ? (
            <p className="text-sm text-muted-foreground">No daily heatmap data.</p>
          ) : (
            <HeatmapMatrix
              title={dailyTitle}
              rows={dailyMatrix.rows}
              columnLabels={dailyMatrix.columnLabels}
              color="green"
              density="comfortable"
              sortable={false}
            />
          )}
        </TabsContent>
        <TabsContent value="weekly" className="mt-4">
          {weeklyEmpty ? (
            <p className="text-sm text-muted-foreground">No weekly heatmap data.</p>
          ) : (
            <HeatmapMatrix
              title={weeklyTitle}
              rows={weeklyMatrix.rows}
              columnLabels={weeklyMatrix.columnLabels}
              color="green"
              density="comfortable"
              sortable={false}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
