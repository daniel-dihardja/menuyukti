import type { PostSchedulerMilestoneData } from '@/lib/graphql/node-schemas'

export type MilestonePostSchedulerDataPreviewProps = {
  data: PostSchedulerMilestoneData
  labels: {
    monthlyArcHeading: string
    contentRatioHeading: string
    formatMixHeading: string
    weeklySlotPlanHeading: string
    emptyWeeklySlotPlan: string
    guardrailCheckHeading: string
    weekLabel: string
    objectiveLabel: string
    rationaleLabel: string
    pillarLabel: string
    percentLabel: string
    reasonLabel: string
    countLabel: string
    dayLabel: string
    formatLabel: string
    hookLabel: string
    captionStructureLabel: string
    ctaTypeLabel: string
    funnelStageLabel: string
    visualDirectionLabel: string
    notesLabel: string
  }
}

export function MilestonePostSchedulerDataPreview({
  data,
  labels,
}: MilestonePostSchedulerDataPreviewProps) {
  const formatNotesValue = (notes: string): string => {
    const trimmed = notes.trim()
    return trimmed ? notes : '-'
  }

  return (
    <div className="flex flex-col gap-y-4 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{labels.monthlyArcHeading}</p>
        <ol className="list-decimal space-y-2 pl-5">
          {data.monthlyArc.weeks.map((item) => (
            <li key={item.week} className="space-y-1">
              <p className="font-medium text-foreground">
                {labels.weekLabel} {item.week}: {item.objective}
              </p>
              <p className="text-muted-foreground">
                {labels.rationaleLabel}: {item.rationale}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-2">
        <p className="font-medium text-foreground">{labels.contentRatioHeading}</p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {data.contentRatio.pillars.map((item, index) => (
            <li key={`${item.pillar}-${index}`}>
              {item.pillar}: {item.percent}% - {item.reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="font-medium text-foreground">{labels.formatMixHeading}</p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {data.formatMix.formats.map((item) => (
            <li key={item.format}>
              {item.format}: {item.count} - {item.reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="font-medium text-foreground">{labels.weeklySlotPlanHeading}</p>
        {data.weeklySlotPlan.length === 0 ? (
          <p className="text-muted-foreground text-sm">{labels.emptyWeeklySlotPlan}</p>
        ) : (
          <ol className="list-decimal space-y-4 pl-5">
            {data.weeklySlotPlan.map((slot, index) => (
              <li
                key={`${slot.week}-${slot.day}-${index}`}
                className="space-y-1 text-muted-foreground"
              >
                <p>
                  {labels.weekLabel}: {slot.week} | {labels.dayLabel}: {slot.day}
                </p>
                <p>
                  {labels.formatLabel}: {slot.format} | {labels.pillarLabel}: {slot.pillar}
                </p>
                <p>
                  {labels.hookLabel}: {slot.hook}
                </p>
                <p>
                  {labels.captionStructureLabel}: {slot.captionStructure}
                </p>
                <p>
                  {labels.ctaTypeLabel}: {slot.ctaType} | {labels.funnelStageLabel}:{' '}
                  {slot.funnelStage}
                </p>
                <p>
                  {labels.visualDirectionLabel}: {slot.visualDirection}
                </p>
                <p>
                  {labels.notesLabel}: {formatNotesValue(slot.notes)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="space-y-1">
        <p className="font-medium text-foreground">{labels.guardrailCheckHeading}</p>
        <p className="text-muted-foreground">{data.guardrailCheck || '—'}</p>
      </div>
    </div>
  )
}
