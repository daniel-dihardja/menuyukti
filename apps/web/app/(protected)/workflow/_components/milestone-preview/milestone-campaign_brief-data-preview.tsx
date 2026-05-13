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

import { MilestonePreviewHelpTrigger } from './milestone-preview-help-trigger'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneCampaignBriefDataPreviewProps = {
  data: CampaignBriefMilestoneData
}

type CampaignBriefPreviewLabels = {
  venueSnapshot: string
  venueName: string
  city: string
  country: string
  currency: string
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
  emptyList: string
  emptyValue: string
  helpVenueSnapshot: string
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

const defaultOpenBriefSections = [
  'venue',
  'objective',
  'pillars',
  'audience',
  'proof',
  'tone',
] as const

export function MilestoneCampaignBriefDataPreview({
  data,
}: MilestoneCampaignBriefDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const formatHelpAriaLabel = (sectionTitle: string) =>
    t('milestoneCampaignBriefPreviewHelpLearnMoreAria', { section: sectionTitle })
  const labels = useMemo<CampaignBriefPreviewLabels>(
    () => ({
      venueSnapshot: t('milestoneCampaignBriefPreviewVenueSnapshot'),
      venueName: t('milestoneCampaignBriefPreviewVenueName'),
      city: t('milestoneCampaignBriefPreviewCity'),
      country: t('milestoneCampaignBriefPreviewCountry'),
      currency: t('milestoneCampaignBriefPreviewCurrency'),
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
      emptyList: t('milestoneCampaignBriefPreviewEmptyList'),
      emptyValue: t('milestoneCampaignBriefPreviewEmptyValue'),
      helpVenueSnapshot: t('milestoneCampaignBriefPreviewHelpVenueSnapshot'),
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
    }),
    [t],
  )
  const a = formatHelpAriaLabel

  return (
    <div className={mp.root}>
      <Accordion
        type="multiple"
        defaultValue={[...defaultOpenBriefSections]}
        className="w-full min-w-0"
      >
        <BriefAccordionSection
          value="venue"
          title={labels.venueSnapshot}
          helpAria={a(labels.venueSnapshot)}
          helpText={labels.helpVenueSnapshot}
        >
          <VenueFields data={data} labels={labels} />
        </BriefAccordionSection>

        <BriefAccordionSection
          value="objective"
          title={labels.campaignObjective}
          helpAria={a(labels.campaignObjective)}
          helpText={labels.helpCampaignObjective}
        >
          <p className={`mt-2 ${mp.body}`}>{data.campaignObjective || labels.emptyValue}</p>
        </BriefAccordionSection>

        <BriefAccordionSection
          value="pillars"
          title={labels.contentPillars}
          helpAria={a(labels.contentPillars)}
          helpText={labels.helpContentPillars}
        >
          <div className="mt-2">{renderList(data.contentPillars, labels.emptyList)}</div>
        </BriefAccordionSection>

        <BriefAccordionSection
          value="audience"
          title={labels.audienceHypotheses}
          helpAria={a(labels.audienceHypotheses)}
          helpText={labels.helpAudienceHypotheses}
        >
          <div className="mt-2">{renderList(data.audienceHypotheses, labels.emptyList)}</div>
        </BriefAccordionSection>

        <BriefAccordionSection
          value="proof"
          title={labels.proofOrientedAngles}
          helpAria={a(labels.proofOrientedAngles)}
          helpText={labels.helpProofOrientedAngles}
        >
          <div className="mt-2">{renderList(data.proofOrientedAngles, labels.emptyList)}</div>
        </BriefAccordionSection>

        <BriefAccordionSection
          value="tone"
          title={labels.toneGuardrails}
          helpAria={a(labels.toneGuardrails)}
          helpText={labels.helpToneGuardrails}
        >
          <div className="mt-2">{renderList(data.toneGuardrails, labels.emptyList)}</div>
        </BriefAccordionSection>

        <BriefAccordionSection
          value="segments"
          title={labels.targetSegments}
          helpAria={a(labels.targetSegments)}
          helpText={labels.helpTargetSegments}
        >
          <div className="mt-2">{renderList(data.targetSegments, labels.emptyList)}</div>
        </BriefAccordionSection>

        <BriefAccordionSection
          value="hierarchy"
          title={labels.messageHierarchy}
          helpAria={a(labels.messageHierarchy)}
          helpText={labels.helpMessageHierarchy}
        >
          <div className="mt-2">{renderList(data.messageHierarchy, labels.emptyList)}</div>
        </BriefAccordionSection>

        <BriefAccordionSection
          value="offer"
          title={labels.offerAndCtaPlan}
          helpAria={a(labels.offerAndCtaPlan)}
          helpText={labels.helpOfferAndCtaPlan}
        >
          <div className="mt-2">{renderList(data.offerAndCtaPlan, labels.emptyList)}</div>
        </BriefAccordionSection>

        <BriefAccordionSection
          value="pillar-plan"
          title={labels.contentPillarPlan}
          helpAria={a(labels.contentPillarPlan)}
          helpText={labels.helpContentPillarPlan}
        >
          <div className="mt-2">{renderList(data.contentPillarPlan, labels.emptyList)}</div>
        </BriefAccordionSection>

        <BriefAccordionSection
          value="measurement"
          title={labels.measurementPlan}
          helpAria={a(labels.measurementPlan)}
          helpText={labels.helpMeasurementPlan}
        >
          <div className="mt-2">{renderList(data.measurementPlan, labels.emptyList)}</div>
        </BriefAccordionSection>

        <BriefAccordionSection
          value="testing"
          title={labels.testingPlan}
          helpAria={a(labels.testingPlan)}
          helpText={labels.helpTestingPlan}
        >
          <div className="mt-2">{renderList(data.testingPlan, labels.emptyList)}</div>
        </BriefAccordionSection>

        <BriefAccordionSection
          value="risk"
          title={labels.riskGuardrails}
          helpAria={a(labels.riskGuardrails)}
          helpText={labels.helpRiskGuardrails}
        >
          <div className="mt-2">{renderList(data.riskGuardrails, labels.emptyList)}</div>
        </BriefAccordionSection>
      </Accordion>
    </div>
  )
}
