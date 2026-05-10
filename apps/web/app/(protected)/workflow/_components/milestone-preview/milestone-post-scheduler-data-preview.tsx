import { MilestonePreviewHelpTrigger } from './milestone-preview-help-trigger'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'

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
    rationaleLabel: string
    pillarLabel: string
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
    placeholderDash: string
    notesPlaceholder: string
    helpMonthlyArc: string
    helpContentRatio: string
    helpFormatMix: string
    helpWeeklySlotPlan: string
    helpGuardrailCheck: string
    formatHelpAriaLabel: (sectionTitle: string) => string
  }
}

function SectionHeader({
  title,
  helpText,
  formatHelpAriaLabel,
}: {
  title: string
  helpText: string
  formatHelpAriaLabel: (sectionTitle: string) => string
}) {
  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <p className={`min-w-0 flex-1 ${mp.sectionTitle}`}>{title}</p>
      <MilestonePreviewHelpTrigger ariaLabel={formatHelpAriaLabel(title)} helpText={helpText} />
    </div>
  )
}

function SlotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-x-3">
      <span className={mp.rowKey}>{label}</span>
      <span className={`min-w-0 ${mp.body}`}>{value}</span>
    </div>
  )
}

function RatioBar({ percent }: { percent: number }) {
  const width = Math.min(100, Math.max(0, percent))
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export function MilestonePostSchedulerDataPreview({
  data,
  labels,
}: MilestonePostSchedulerDataPreviewProps) {
  const a = labels.formatHelpAriaLabel
  const formatNotesValue = (notes: string): string => {
    const trimmed = notes.trim()
    return trimmed ? notes : labels.notesPlaceholder
  }

  return (
    <div className={mp.root}>
      <div className="space-y-3">
        <SectionHeader
          title={labels.monthlyArcHeading}
          helpText={labels.helpMonthlyArc}
          formatHelpAriaLabel={a}
        />
        <div className="flex flex-wrap gap-2">
          {data.monthlyArc.weeks.map((item) => (
            <div
              key={item.week}
              className={`min-w-[min(100%,11rem)] flex-1 basis-[10rem] ${mp.insetCard} space-y-2`}
            >
              <p className={`${mp.fieldLabel}`}>
                {labels.weekLabel} {item.week}
              </p>
              <p className={mp.bodyStrong}>{item.objective}</p>
              <p className={mp.bodySmall}>
                <span className="font-medium text-foreground">{labels.rationaleLabel}:</span>{' '}
                {item.rationale}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeader
          title={labels.contentRatioHeading}
          helpText={labels.helpContentRatio}
          formatHelpAriaLabel={a}
        />
        <ul className="space-y-3">
          {data.contentRatio.pillars.map((item, index) => (
            <li key={`${item.pillar}-${index}`} className={mp.insetCard}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className={mp.bodyStrong}>{item.pillar}</span>
                <span className={`shrink-0 tabular-nums ${mp.bodySmall}`}>{item.percent}%</span>
              </div>
              <RatioBar percent={item.percent} />
              <p className={`mt-2 ${mp.bodySmall}`}>
                <span className="font-medium text-foreground">{labels.reasonLabel}:</span>{' '}
                {item.reason}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <SectionHeader
          title={labels.formatMixHeading}
          helpText={labels.helpFormatMix}
          formatHelpAriaLabel={a}
        />
        <ul className="space-y-3">
          {(() => {
            const maxCount = Math.max(1, ...data.formatMix.formats.map((f) => f.count))
            return data.formatMix.formats.map((item) => (
              <li key={item.format} className={mp.insetCard}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={mp.bodyStrong}>{item.format}</span>
                  <span className={`shrink-0 ${mp.bodySmall}`}>
                    {item.count}{' '}
                    <span className="text-muted-foreground">({labels.countLabel})</span>
                  </span>
                </div>
                <RatioBar percent={(item.count / maxCount) * 100} />
                <p className={`mt-2 ${mp.bodySmall}`}>
                  <span className="font-medium text-foreground">{labels.reasonLabel}:</span>{' '}
                  {item.reason}
                </p>
              </li>
            ))
          })()}
        </ul>
      </div>

      <div className="space-y-3">
        <SectionHeader
          title={labels.weeklySlotPlanHeading}
          helpText={labels.helpWeeklySlotPlan}
          formatHelpAriaLabel={a}
        />
        {data.weeklySlotPlan.length === 0 ? (
          <p className={mp.body}>{labels.emptyWeeklySlotPlan}</p>
        ) : (
          <ol className={`${mp.listDecimal} space-y-4`}>
            {data.weeklySlotPlan.map((slot, index) => (
              <li key={`${slot.week}-${slot.day}-${index}`} className={mp.insetCard}>
                <div className="space-y-2">
                  <SlotRow label={labels.weekLabel} value={String(slot.week)} />
                  <SlotRow label={labels.dayLabel} value={slot.day} />
                  <SlotRow label={labels.formatLabel} value={slot.format} />
                  <SlotRow label={labels.pillarLabel} value={slot.pillar} />
                  <SlotRow label={labels.hookLabel} value={slot.hook} />
                  <SlotRow label={labels.captionStructureLabel} value={slot.captionStructure} />
                  <SlotRow label={labels.ctaTypeLabel} value={slot.ctaType} />
                  <SlotRow label={labels.funnelStageLabel} value={slot.funnelStage} />
                  <SlotRow label={labels.visualDirectionLabel} value={slot.visualDirection} />
                  <SlotRow label={labels.notesLabel} value={formatNotesValue(slot.notes)} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="space-y-2">
        <SectionHeader
          title={labels.guardrailCheckHeading}
          helpText={labels.helpGuardrailCheck}
          formatHelpAriaLabel={a}
        />
        <p className={mp.body}>
          {data.guardrailCheck?.trim() ? data.guardrailCheck : labels.placeholderDash}
        </p>
      </div>
    </div>
  )
}
