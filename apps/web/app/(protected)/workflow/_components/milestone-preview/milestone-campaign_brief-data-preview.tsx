'use client'

import { type ReactNode, useMemo } from 'react'
import { useTranslations } from 'next-intl'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import type { CampaignBriefMilestoneData } from '@/lib/graphql/node-schemas'
import {
  hasCampaignBriefListContent,
  hasCampaignBriefOverallStrategyContent,
  hasCampaignBriefPreviewContent,
  hasCampaignBriefSlotPerformanceContent,
  hasCampaignBriefVenueSnapshotContent,
} from '@/lib/milestones/campaign-brief-preview-content'
import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'

import { MilestonePreviewHelpTrigger } from './milestone-preview-help-trigger'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneCampaignBriefDataPreviewProps = {
  data: CampaignBriefMilestoneData
}

type CampaignBriefPreviewLabels = {
  venueSnapshot: string
  overallStrategy: string
  venueName: string
  city: string
  country: string
  currency: string
  strategyFocus: string
  audiencePriority: string
  coreMessage: string
  offerWindow: string
  cadenceGuidance: string
  contentPillars: string
  audienceHypotheses: string
  proofOrientedAngles: string
  toneGuardrails: string
  campaignObjective: string
  targetSegments: string
  messageHierarchy: string
  offerAndCtaPlan: string
  contentPillarPlan: string
  measurementPlan: string
  testingPlan: string
  riskGuardrails: string
  slotPerformance: string
  slotPerformanceSummary: string
  strongSlots: string
  slotsNeedingPromotion: string
  slotTableDay: string
  slotTableMealPeriod: string
  slotTableDemandIndex: string
  slotTableTier: string
  slotTablePosture: string
  slotPostureSupport: string
  slotPosturePromote: string
  slotPostureMaintain: string
  slotTierLow: string
  slotTierAverage: string
  slotTierHigh: string
  emptyList: string
  emptyValue: string
  helpVenueSnapshot: string
  helpOverallStrategy: string
  helpContentPillars: string
  helpAudienceHypotheses: string
  helpProofOrientedAngles: string
  helpToneGuardrails: string
  helpCampaignObjective: string
  helpTargetSegments: string
  helpMessageHierarchy: string
  helpOfferAndCtaPlan: string
  helpContentPillarPlan: string
  helpMeasurementPlan: string
  helpTestingPlan: string
  helpRiskGuardrails: string
  helpSlotPerformance: string
}

function renderList(items: string[], emptyLabel: string) {
  if (items.length === 0) {
    return <p className={mp.bodySmall}>{emptyLabel}</p>
  }
  return (
    <ul className={mp.listDisc}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  )
}

type BriefAccordionSectionProps = {
  value: string
  title: string
  helpAria: string
  helpText: string
  children: ReactNode
}

function BriefAccordionSection({
  value,
  title,
  helpAria,
  helpText,
  children,
}: BriefAccordionSectionProps) {
  return (
    <AccordionItem value={value} className="border-border/80">
      <AccordionTrigger
        className="py-3 text-base font-semibold hover:no-underline [&>svg]:size-4"
        trailing={<MilestonePreviewHelpTrigger ariaLabel={helpAria} helpText={helpText} />}
      >
        <span className="min-w-0 text-left">{title}</span>
      </AccordionTrigger>
      <AccordionContent
        className={`${mp.accordionContentInner} text-base leading-relaxed [&_*]:leading-relaxed`}
      >
        {children}
      </AccordionContent>
    </AccordionItem>
  )
}

function VenueFields({
  data,
  labels,
}: {
  data: CampaignBriefMilestoneData
  labels: CampaignBriefPreviewLabels
}) {
  const rows: [string, string][] = [
    [labels.venueName, data.venueSnapshot.venueName || labels.emptyValue],
    [labels.city, data.venueSnapshot.city || labels.emptyValue],
    [labels.country, data.venueSnapshot.country || labels.emptyValue],
    [labels.currency, data.venueSnapshot.currency || labels.emptyValue],
  ]
  return (
    <dl className="mt-2 space-y-3">
      {rows.map(([term, def]) => (
        <div key={term} className="grid gap-1 sm:grid-cols-[minmax(0,auto)_1fr] sm:gap-x-4">
          <dt className={mp.fieldLabel}>{term}</dt>
          <dd className={mp.body}>{def}</dd>
        </div>
      ))}
    </dl>
  )
}

function OverallStrategyFields({
  data,
  labels,
}: {
  data: CampaignBriefMilestoneData
  labels: CampaignBriefPreviewLabels
}) {
  const strategy = data.overallStrategy
  if (!strategy) {
    return <p className={`mt-2 ${mp.body}`}>{labels.emptyValue}</p>
  }

  const rows: [string, string][] = [
    [labels.strategyFocus, strategy.strategyFocus || labels.emptyValue],
    [labels.coreMessage, strategy.coreMessage || labels.emptyValue],
    [labels.offerWindow, strategy.offerWindow || labels.emptyValue],
  ]

  return (
    <div className="mt-2 space-y-4">
      <dl className="space-y-3">
        {rows.map(([term, def]) => (
          <div key={term} className="grid gap-1 sm:grid-cols-[minmax(0,auto)_1fr] sm:gap-x-4">
            <dt className={mp.fieldLabel}>{term}</dt>
            <dd className={mp.body}>{def}</dd>
          </div>
        ))}
      </dl>

      <div>
        <p className={mp.fieldLabel}>{labels.audiencePriority}</p>
        <div className="mt-2">{renderList(strategy.audiencePriority ?? [], labels.emptyList)}</div>
      </div>

      <div>
        <p className={mp.fieldLabel}>{labels.cadenceGuidance}</p>
        <div className="mt-2">{renderList(strategy.cadenceGuidance ?? [], labels.emptyList)}</div>
      </div>
    </div>
  )
}

function postureBadgeClassName(posture: 'support' | 'promote' | 'maintain'): string {
  switch (posture) {
    case 'support':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    case 'promote':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
    default:
      return 'border-border bg-muted/50 text-muted-foreground'
  }
}

function SlotPerformanceFields({
  slotPerformance,
  labels,
}: {
  slotPerformance: NonNullable<CampaignBriefMilestoneData['slotPerformance']>
  labels: CampaignBriefPreviewLabels
}) {
  const postureLabel = (posture: 'support' | 'promote' | 'maintain') => {
    switch (posture) {
      case 'support':
        return labels.slotPostureSupport
      case 'promote':
        return labels.slotPosturePromote
      default:
        return labels.slotPostureMaintain
    }
  }

  const tierLabel = (tier: 'low' | 'average' | 'high') => {
    switch (tier) {
      case 'low':
        return labels.slotTierLow
      case 'high':
        return labels.slotTierHigh
      default:
        return labels.slotTierAverage
    }
  }

  const weekdayLabel = (day: string) => day.slice(0, 1).toUpperCase() + day.slice(1, 3)

  return (
    <div className="mt-2 space-y-4">
      {slotPerformance.summary.trim() ? <p className={mp.body}>{slotPerformance.summary}</p> : null}

      <div>
        <p className={mp.fieldLabel}>{labels.strongSlots}</p>
        <div className="mt-2">{renderList(slotPerformance.strongSlots, labels.emptyList)}</div>
      </div>

      <div>
        <p className={mp.fieldLabel}>{labels.slotsNeedingPromotion}</p>
        <div className="mt-2">
          {renderList(slotPerformance.slotsNeedingPromotion, labels.emptyList)}
        </div>
      </div>

      {slotPerformance.slots.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 text-left">
                <th className={cn(mp.fieldLabel, 'py-2 pr-3')}>{labels.slotTableDay}</th>
                <th className={cn(mp.fieldLabel, 'py-2 pr-3')}>{labels.slotTableMealPeriod}</th>
                <th className={cn(mp.fieldLabel, 'py-2 pr-3 text-right')}>
                  {labels.slotTableDemandIndex}
                </th>
                <th className={cn(mp.fieldLabel, 'py-2 pr-3')}>{labels.slotTableTier}</th>
                <th className={cn(mp.fieldLabel, 'py-2')}>{labels.slotTablePosture}</th>
              </tr>
            </thead>
            <tbody>
              {slotPerformance.slots.map((slot) => (
                <tr key={`${slot.day}-${slot.mealPeriod}`} className="border-b border-border/50">
                  <td className="py-2 pr-3 align-top">{weekdayLabel(slot.day)}</td>
                  <td className="py-2 pr-3 align-top">{slot.mealPeriodLabel}</td>
                  <td className="py-2 pr-3 align-top text-right tabular-nums">
                    {slot.demandIndex.toFixed(2)}×
                  </td>
                  <td className="py-2 pr-3 align-top">{tierLabel(slot.relativeDemand)}</td>
                  <td className="py-2 align-top">
                    <Badge
                      variant="outline"
                      className={cn('text-xs uppercase', postureBadgeClassName(slot.posture))}
                    >
                      {postureLabel(slot.posture)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function CampaignBriefPreviewEmptyState() {
  const t = useTranslations('analytics.workflows.chat')
  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4">
      <p className="text-base font-semibold text-foreground">
        {t('milestonePreviewDataEmptyTitle')}
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t('milestonePreviewDataEmptyBody')}
      </p>
    </div>
  )
}

export function MilestoneCampaignBriefDataPreview({
  data,
}: MilestoneCampaignBriefDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const labels = useMemo<CampaignBriefPreviewLabels>(
    () => ({
      venueSnapshot: t('milestoneCampaignBriefPreviewVenueSnapshot'),
      overallStrategy: t('milestoneCampaignBriefPreviewOverallStrategy'),
      venueName: t('milestoneCampaignBriefPreviewVenueName'),
      city: t('milestoneCampaignBriefPreviewCity'),
      country: t('milestoneCampaignBriefPreviewCountry'),
      currency: t('milestoneCampaignBriefPreviewCurrency'),
      strategyFocus: t('milestoneCampaignBriefPreviewStrategyFocus'),
      audiencePriority: t('milestoneCampaignBriefPreviewAudiencePriority'),
      coreMessage: t('milestoneCampaignBriefPreviewCoreMessage'),
      offerWindow: t('milestoneCampaignBriefPreviewOfferWindow'),
      cadenceGuidance: t('milestoneCampaignBriefPreviewCadenceGuidance'),
      contentPillars: t('milestoneCampaignBriefPreviewContentPillars'),
      audienceHypotheses: t('milestoneCampaignBriefPreviewAudienceHypotheses'),
      proofOrientedAngles: t('milestoneCampaignBriefPreviewProofOrientedAngles'),
      toneGuardrails: t('milestoneCampaignBriefPreviewToneGuardrails'),
      campaignObjective: t('milestoneCampaignBriefPreviewCampaignObjective'),
      targetSegments: t('milestoneCampaignBriefPreviewTargetSegments'),
      messageHierarchy: t('milestoneCampaignBriefPreviewMessageHierarchy'),
      offerAndCtaPlan: t('milestoneCampaignBriefPreviewOfferAndCtaPlan'),
      contentPillarPlan: t('milestoneCampaignBriefPreviewContentPillarPlan'),
      measurementPlan: t('milestoneCampaignBriefPreviewMeasurementPlan'),
      testingPlan: t('milestoneCampaignBriefPreviewTestingPlan'),
      riskGuardrails: t('milestoneCampaignBriefPreviewRiskGuardrails'),
      slotPerformance: t('milestoneCampaignBriefPreviewSlotPerformance'),
      slotPerformanceSummary: t('milestoneCampaignBriefPreviewSlotPerformanceSummary'),
      strongSlots: t('milestoneCampaignBriefPreviewStrongSlots'),
      slotsNeedingPromotion: t('milestoneCampaignBriefPreviewSlotsNeedingPromotion'),
      slotTableDay: t('milestoneCampaignBriefPreviewSlotTableDay'),
      slotTableMealPeriod: t('milestoneCampaignBriefPreviewSlotTableMealPeriod'),
      slotTableDemandIndex: t('milestoneCampaignBriefPreviewSlotTableDemandIndex'),
      slotTableTier: t('milestoneCampaignBriefPreviewSlotTableTier'),
      slotTablePosture: t('milestoneCampaignBriefPreviewSlotTablePosture'),
      slotPostureSupport: t('milestoneCampaignBriefPreviewSlotPostureSupport'),
      slotPosturePromote: t('milestoneCampaignBriefPreviewSlotPosturePromote'),
      slotPostureMaintain: t('milestoneCampaignBriefPreviewSlotPostureMaintain'),
      slotTierLow: t('milestoneCampaignBriefPreviewSlotTierLow'),
      slotTierAverage: t('milestoneCampaignBriefPreviewSlotTierAverage'),
      slotTierHigh: t('milestoneCampaignBriefPreviewSlotTierHigh'),
      emptyList: t('milestoneCampaignBriefPreviewEmptyList'),
      emptyValue: t('milestoneCampaignBriefPreviewEmptyValue'),
      helpVenueSnapshot: t('milestoneCampaignBriefPreviewHelpVenueSnapshot'),
      helpOverallStrategy: t('milestoneCampaignBriefPreviewHelpOverallStrategy'),
      helpContentPillars: t('milestoneCampaignBriefPreviewHelpContentPillars'),
      helpAudienceHypotheses: t('milestoneCampaignBriefPreviewHelpAudienceHypotheses'),
      helpProofOrientedAngles: t('milestoneCampaignBriefPreviewHelpProofOrientedAngles'),
      helpToneGuardrails: t('milestoneCampaignBriefPreviewHelpToneGuardrails'),
      helpCampaignObjective: t('milestoneCampaignBriefPreviewHelpCampaignObjective'),
      helpTargetSegments: t('milestoneCampaignBriefPreviewHelpTargetSegments'),
      helpMessageHierarchy: t('milestoneCampaignBriefPreviewHelpMessageHierarchy'),
      helpOfferAndCtaPlan: t('milestoneCampaignBriefPreviewHelpOfferAndCtaPlan'),
      helpContentPillarPlan: t('milestoneCampaignBriefPreviewHelpContentPillarPlan'),
      helpMeasurementPlan: t('milestoneCampaignBriefPreviewHelpMeasurementPlan'),
      helpTestingPlan: t('milestoneCampaignBriefPreviewHelpTestingPlan'),
      helpRiskGuardrails: t('milestoneCampaignBriefPreviewHelpRiskGuardrails'),
      helpSlotPerformance: t('milestoneCampaignBriefPreviewHelpSlotPerformance'),
    }),
    [t],
  )

  if (!hasCampaignBriefPreviewContent(data)) {
    return <CampaignBriefPreviewEmptyState />
  }

  const formatHelpAriaLabel = (sectionTitle: string) =>
    t('milestoneCampaignBriefPreviewHelpLearnMoreAria', { section: sectionTitle })
  const a = formatHelpAriaLabel

  const showVenue = hasCampaignBriefVenueSnapshotContent(data.venueSnapshot)
  const showOverallStrategy = hasCampaignBriefOverallStrategyContent(data.overallStrategy)
  const showObjective = data.campaignObjective.trim().length > 0
  const showPillars = hasCampaignBriefListContent(data.contentPillars)
  const showAudience = hasCampaignBriefListContent(data.audienceHypotheses)
  const showProof = hasCampaignBriefListContent(data.proofOrientedAngles)
  const showTone = hasCampaignBriefListContent(data.toneGuardrails)
  const showSegments = hasCampaignBriefListContent(data.targetSegments)
  const showHierarchy = hasCampaignBriefListContent(data.messageHierarchy)
  const showOffer = hasCampaignBriefListContent(data.offerAndCtaPlan)
  const showPillarPlan = hasCampaignBriefListContent(data.contentPillarPlan)
  const showMeasurement = hasCampaignBriefListContent(data.measurementPlan)
  const showTesting = hasCampaignBriefListContent(data.testingPlan)
  const showRisk = hasCampaignBriefListContent(data.riskGuardrails)
  const showSlotPerformance = hasCampaignBriefSlotPerformanceContent(data.slotPerformance)

  return (
    <div className={mp.root}>
      <Accordion type="multiple" defaultValue={[]} className="w-full min-w-0">
        {showVenue ? (
          <BriefAccordionSection
            value="venue"
            title={labels.venueSnapshot}
            helpAria={a(labels.venueSnapshot)}
            helpText={labels.helpVenueSnapshot}
          >
            <VenueFields data={data} labels={labels} />
          </BriefAccordionSection>
        ) : null}

        {showOverallStrategy ? (
          <BriefAccordionSection
            value="overall-strategy"
            title={labels.overallStrategy}
            helpAria={a(labels.overallStrategy)}
            helpText={labels.helpOverallStrategy}
          >
            <OverallStrategyFields data={data} labels={labels} />
          </BriefAccordionSection>
        ) : null}

        {showObjective ? (
          <BriefAccordionSection
            value="objective"
            title={labels.campaignObjective}
            helpAria={a(labels.campaignObjective)}
            helpText={labels.helpCampaignObjective}
          >
            <p className={`mt-2 ${mp.body}`}>{data.campaignObjective}</p>
          </BriefAccordionSection>
        ) : null}

        {showSlotPerformance && data.slotPerformance ? (
          <BriefAccordionSection
            value="slot-performance"
            title={labels.slotPerformance}
            helpAria={a(labels.slotPerformance)}
            helpText={labels.helpSlotPerformance}
          >
            <SlotPerformanceFields slotPerformance={data.slotPerformance} labels={labels} />
          </BriefAccordionSection>
        ) : null}

        {showPillars ? (
          <BriefAccordionSection
            value="pillars"
            title={labels.contentPillars}
            helpAria={a(labels.contentPillars)}
            helpText={labels.helpContentPillars}
          >
            <div className="mt-2">{renderList(data.contentPillars, labels.emptyList)}</div>
          </BriefAccordionSection>
        ) : null}

        {showAudience ? (
          <BriefAccordionSection
            value="audience"
            title={labels.audienceHypotheses}
            helpAria={a(labels.audienceHypotheses)}
            helpText={labels.helpAudienceHypotheses}
          >
            <div className="mt-2">{renderList(data.audienceHypotheses, labels.emptyList)}</div>
          </BriefAccordionSection>
        ) : null}

        {showProof ? (
          <BriefAccordionSection
            value="proof"
            title={labels.proofOrientedAngles}
            helpAria={a(labels.proofOrientedAngles)}
            helpText={labels.helpProofOrientedAngles}
          >
            <div className="mt-2">{renderList(data.proofOrientedAngles, labels.emptyList)}</div>
          </BriefAccordionSection>
        ) : null}

        {showTone ? (
          <BriefAccordionSection
            value="tone"
            title={labels.toneGuardrails}
            helpAria={a(labels.toneGuardrails)}
            helpText={labels.helpToneGuardrails}
          >
            <div className="mt-2">{renderList(data.toneGuardrails, labels.emptyList)}</div>
          </BriefAccordionSection>
        ) : null}

        {showSegments ? (
          <BriefAccordionSection
            value="segments"
            title={labels.targetSegments}
            helpAria={a(labels.targetSegments)}
            helpText={labels.helpTargetSegments}
          >
            <div className="mt-2">{renderList(data.targetSegments, labels.emptyList)}</div>
          </BriefAccordionSection>
        ) : null}

        {showHierarchy ? (
          <BriefAccordionSection
            value="hierarchy"
            title={labels.messageHierarchy}
            helpAria={a(labels.messageHierarchy)}
            helpText={labels.helpMessageHierarchy}
          >
            <div className="mt-2">{renderList(data.messageHierarchy, labels.emptyList)}</div>
          </BriefAccordionSection>
        ) : null}

        {showOffer ? (
          <BriefAccordionSection
            value="offer"
            title={labels.offerAndCtaPlan}
            helpAria={a(labels.offerAndCtaPlan)}
            helpText={labels.helpOfferAndCtaPlan}
          >
            <div className="mt-2">{renderList(data.offerAndCtaPlan, labels.emptyList)}</div>
          </BriefAccordionSection>
        ) : null}

        {showPillarPlan ? (
          <BriefAccordionSection
            value="pillar-plan"
            title={labels.contentPillarPlan}
            helpAria={a(labels.contentPillarPlan)}
            helpText={labels.helpContentPillarPlan}
          >
            <div className="mt-2">{renderList(data.contentPillarPlan, labels.emptyList)}</div>
          </BriefAccordionSection>
        ) : null}

        {showMeasurement ? (
          <BriefAccordionSection
            value="measurement"
            title={labels.measurementPlan}
            helpAria={a(labels.measurementPlan)}
            helpText={labels.helpMeasurementPlan}
          >
            <div className="mt-2">{renderList(data.measurementPlan, labels.emptyList)}</div>
          </BriefAccordionSection>
        ) : null}

        {showTesting ? (
          <BriefAccordionSection
            value="testing"
            title={labels.testingPlan}
            helpAria={a(labels.testingPlan)}
            helpText={labels.helpTestingPlan}
          >
            <div className="mt-2">{renderList(data.testingPlan, labels.emptyList)}</div>
          </BriefAccordionSection>
        ) : null}

        {showRisk ? (
          <BriefAccordionSection
            value="risk"
            title={labels.riskGuardrails}
            helpAria={a(labels.riskGuardrails)}
            helpText={labels.helpRiskGuardrails}
          >
            <div className="mt-2">{renderList(data.riskGuardrails, labels.emptyList)}</div>
          </BriefAccordionSection>
        ) : null}
      </Accordion>
    </div>
  )
}
