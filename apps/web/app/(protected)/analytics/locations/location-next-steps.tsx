import Link from 'next/link'

import { ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

type LocationNextStepsProps = {
  locationId: string | number
  latestAnalyticsId: number | null
  labels: {
    title: string
    uploadSales: string
    viewAnalytics: string
    openWorkflow: string
  }
}

export function LocationNextSteps({
  locationId,
  latestAnalyticsId,
  labels,
}: LocationNextStepsProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{labels.title}</h2>
      <div className="flex gap-2 overflow-x-auto">
        <Button asChild className="shrink-0 touch-manipulation" size="sm">
          <Link href={routes.analytics.salesWithLocation(locationId)}>{labels.uploadSales}</Link>
        </Button>
        {latestAnalyticsId !== null ? (
          <Button asChild className="shrink-0 touch-manipulation" size="sm" variant="outline">
            <Link href={routes.analytics.matrix(latestAnalyticsId)}>{labels.viewAnalytics}</Link>
          </Button>
        ) : null}
        <Button asChild className="shrink-0 touch-manipulation" size="sm" variant="outline">
          <Link href={routes.workflows.list}>{labels.openWorkflow}</Link>
        </Button>
      </div>
    </section>
  )
}

export const LOCATION_DETAIL_SECTION_CLASS = cn(
  'flex flex-col gap-4',
  ANALYTICS_REPORT_SECTION_CLASS,
)
