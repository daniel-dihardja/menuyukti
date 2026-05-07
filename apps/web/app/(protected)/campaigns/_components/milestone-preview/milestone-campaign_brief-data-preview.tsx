'use client'

import { TooltipProvider } from '@workspace/ui/components/tooltip'

import type { CampaignBriefMilestoneData } from '@/lib/graphql/node-schemas'

import { CampaignBriefPreviewHelpIcon } from './campaign-brief-preview-help-icon'

export type MilestoneCampaignBriefDataPreviewProps = {
  data: CampaignBriefMilestoneData
  labels: CampaignBriefPreviewLabels
  /** Accessible name for each help control, e.g. “Learn more: Start date”. */
  formatHelpAriaLabel: (sectionTitle: string) => string
  /** ISO `YYYY-MM-DD` → `<Weekday>. DD.MM.YYYY` for preview display. */
  formatDate: (isoDate: string) => string
}

export type CampaignBriefPreviewLabels = {
  startDate: string
  endDate: string
  publicHolidays: string
  noHolidays: string
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
  helpStartDate: string
  helpEndDate: string
  helpPublicHolidays: string
}

function renderList(items: string[], emptyLabel: string) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  )
}

export function MilestoneCampaignBriefDataPreview({
  data,
  labels,
  formatHelpAriaLabel,
  formatDate,
}: MilestoneCampaignBriefDataPreviewProps) {
  const a = formatHelpAriaLabel

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4 text-sm">
        <section>
          <dl className="grid grid-cols-[minmax(0,140px)_1fr] gap-y-2 gap-x-2">
            <dt className="flex items-center gap-0.5 font-medium text-foreground">
              <span>{labels.startDate}</span>
              <CampaignBriefPreviewHelpIcon
                ariaLabel={a(labels.startDate)}
                helpText={labels.helpStartDate}
              />
            </dt>
            <dd className="text-muted-foreground">
              {data.startDate ? formatDate(data.startDate) : labels.emptyValue}
            </dd>
            <dt className="flex items-center gap-0.5 font-medium text-foreground">
              <span>{labels.endDate}</span>
              <CampaignBriefPreviewHelpIcon
                ariaLabel={a(labels.endDate)}
                helpText={labels.helpEndDate}
              />
            </dt>
            <dd className="text-muted-foreground">
              {data.endDate ? formatDate(data.endDate) : labels.emptyValue}
            </dd>
          </dl>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.publicHolidays}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.publicHolidays)}
              helpText={labels.helpPublicHolidays}
            />
          </div>
          {data.publicHolidays.length === 0 ? (
            <p className="mt-2 text-muted-foreground text-sm">{labels.noHolidays}</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {data.publicHolidays.map((holiday, index) => (
                <li key={`${holiday.date}-${holiday.name}-${index}`}>
                  <span className="font-medium text-foreground">{formatDate(holiday.date)}</span> -{' '}
                  {holiday.name}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.venueSnapshot}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.venueSnapshot)}
              helpText={labels.helpVenueSnapshot}
            />
          </div>
          <dl className="mt-2 grid grid-cols-[minmax(0,140px)_1fr] gap-y-2 gap-x-2">
            <dt className="font-medium text-foreground">{labels.venueName}</dt>
            <dd className="text-muted-foreground">
              {data.venueSnapshot.venueName || labels.emptyValue}
            </dd>
            <dt className="font-medium text-foreground">{labels.city}</dt>
            <dd className="text-muted-foreground">
              {data.venueSnapshot.city || labels.emptyValue}
            </dd>
            <dt className="font-medium text-foreground">{labels.country}</dt>
            <dd className="text-muted-foreground">
              {data.venueSnapshot.country || labels.emptyValue}
            </dd>
            <dt className="font-medium text-foreground">{labels.currency}</dt>
            <dd className="text-muted-foreground">
              {data.venueSnapshot.currency || labels.emptyValue}
            </dd>
          </dl>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.campaignObjective}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.campaignObjective)}
              helpText={labels.helpCampaignObjective}
            />
          </div>
          <p className="mt-2 text-muted-foreground">
            {data.campaignObjective || labels.emptyValue}
          </p>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.contentPillars}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.contentPillars)}
              helpText={labels.helpContentPillars}
            />
          </div>
          <div className="mt-2">{renderList(data.contentPillars, labels.emptyList)}</div>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.audienceHypotheses}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.audienceHypotheses)}
              helpText={labels.helpAudienceHypotheses}
            />
          </div>
          <div className="mt-2">{renderList(data.audienceHypotheses, labels.emptyList)}</div>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.proofOrientedAngles}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.proofOrientedAngles)}
              helpText={labels.helpProofOrientedAngles}
            />
          </div>
          <div className="mt-2">{renderList(data.proofOrientedAngles, labels.emptyList)}</div>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.toneGuardrails}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.toneGuardrails)}
              helpText={labels.helpToneGuardrails}
            />
          </div>
          <div className="mt-2">{renderList(data.toneGuardrails, labels.emptyList)}</div>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.targetSegments}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.targetSegments)}
              helpText={labels.helpTargetSegments}
            />
          </div>
          <div className="mt-2">{renderList(data.targetSegments, labels.emptyList)}</div>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.messageHierarchy}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.messageHierarchy)}
              helpText={labels.helpMessageHierarchy}
            />
          </div>
          <div className="mt-2">{renderList(data.messageHierarchy, labels.emptyList)}</div>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.offerAndCtaPlan}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.offerAndCtaPlan)}
              helpText={labels.helpOfferAndCtaPlan}
            />
          </div>
          <div className="mt-2">{renderList(data.offerAndCtaPlan, labels.emptyList)}</div>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.contentPillarPlan}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.contentPillarPlan)}
              helpText={labels.helpContentPillarPlan}
            />
          </div>
          <div className="mt-2">{renderList(data.contentPillarPlan, labels.emptyList)}</div>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.measurementPlan}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.measurementPlan)}
              helpText={labels.helpMeasurementPlan}
            />
          </div>
          <div className="mt-2">{renderList(data.measurementPlan, labels.emptyList)}</div>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.testingPlan}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.testingPlan)}
              helpText={labels.helpTestingPlan}
            />
          </div>
          <div className="mt-2">{renderList(data.testingPlan, labels.emptyList)}</div>
        </section>

        <section>
          <div className="flex items-center gap-0.5">
            <h4 className="font-medium text-foreground">{labels.riskGuardrails}</h4>
            <CampaignBriefPreviewHelpIcon
              ariaLabel={a(labels.riskGuardrails)}
              helpText={labels.helpRiskGuardrails}
            />
          </div>
          <div className="mt-2">{renderList(data.riskGuardrails, labels.emptyList)}</div>
        </section>
      </div>
    </TooltipProvider>
  )
}
