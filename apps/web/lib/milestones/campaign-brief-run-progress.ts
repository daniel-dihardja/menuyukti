/** SSE step keys for campaign-brief generation (before milestone eval). */
export const CAMPAIGN_BRIEF_GENERATION_STEP_KEYS = [
  'prepare_brief_context',
  'generate_draft',
  'reflect_critique',
  'reflect_revise',
  'store_brief',
] as const

export type CampaignBriefGenerationStepKey = (typeof CAMPAIGN_BRIEF_GENERATION_STEP_KEYS)[number]

export type CampaignBriefPipelineStageKind = 'create' | 'review' | 'edit' | 'save'

export type CampaignBriefPipelineStageStatus = 'pending' | 'active' | 'done'

export type CampaignBriefPipelineStage = {
  id: string
  kind: CampaignBriefPipelineStageKind
  pass?: number
  status: CampaignBriefPipelineStageStatus
}

export type CampaignBriefReflectionRoundLike = {
  iteration: number
  critiques: Array<{ qualityPass: boolean }>
}

export function isCampaignBriefGenerationStep(
  step: string | null | undefined,
): step is CampaignBriefGenerationStepKey | 'execute_skill' {
  if (!step) {
    return false
  }
  if (step === 'execute_skill') {
    return true
  }
  return (CAMPAIGN_BRIEF_GENERATION_STEP_KEYS as readonly string[]).includes(step)
}

export function campaignBriefGenerationStepIndex(step: string | null | undefined): number {
  if (!step) {
    return -1
  }
  if (step === 'execute_skill') {
    return 0
  }
  return CAMPAIGN_BRIEF_GENERATION_STEP_KEYS.indexOf(step as CampaignBriefGenerationStepKey)
}

export function isCampaignBriefCreateStep(step: string | null | undefined): boolean {
  return (
    !step ||
    step === 'prepare_brief_context' ||
    step === 'execute_skill' ||
    step === 'generate_draft'
  )
}

/** Visible pipeline stages grow as each phase starts — future steps stay hidden. */
export function buildCampaignBriefPipelineStages(
  runningStep: string | null | undefined,
  runningStepIteration: number | null | undefined,
  reflectionEnabled: boolean,
  reflectionRounds: CampaignBriefReflectionRoundLike[],
): CampaignBriefPipelineStage[] {
  const iteration = runningStepIteration ?? 1
  const stages: CampaignBriefPipelineStage[] = [
    {
      id: 'create',
      kind: 'create',
      status: isCampaignBriefCreateStep(runningStep) ? 'active' : 'done',
    },
  ]

  if (!reflectionEnabled) {
    if (runningStep === 'store_brief') {
      stages.push({ id: 'save', kind: 'save', status: 'active' })
    }
    return stages
  }

  let maxStartedPass = 0
  if (runningStep === 'reflect_critique' || runningStep === 'reflect_revise') {
    maxStartedPass = iteration
  }
  for (const round of reflectionRounds) {
    maxStartedPass = Math.max(maxStartedPass, round.iteration)
  }

  for (let pass = 1; pass <= maxStartedPass; pass++) {
    const round = reflectionRounds.find((row) => row.iteration === pass)
    const reviewComplete = round != null
    const isReviewActive =
      runningStep === 'reflect_critique' && iteration === pass && !reviewComplete
    const isReviewDone =
      reviewComplete ||
      (runningStep === 'reflect_revise' && iteration >= pass) ||
      (runningStep === 'reflect_critique' && iteration > pass) ||
      runningStep === 'store_brief'

    stages.push({
      id: `review-${pass}`,
      kind: 'review',
      pass,
      status: isReviewActive ? 'active' : isReviewDone ? 'done' : 'pending',
    })

    const roundHadFailures = round?.critiques.some((row) => !row.qualityPass) ?? false
    const showEdit =
      (runningStep === 'reflect_revise' && iteration === pass) ||
      (roundHadFailures && reviewComplete)

    if (showEdit) {
      const isEditActive = runningStep === 'reflect_revise' && iteration === pass
      const isEditDone =
        !isEditActive &&
        ((runningStep === 'reflect_critique' && iteration > pass) || runningStep === 'store_brief')
      stages.push({
        id: `edit-${pass}`,
        kind: 'edit',
        pass,
        status: isEditActive ? 'active' : isEditDone ? 'done' : 'pending',
      })
    }
  }

  if (runningStep === 'store_brief') {
    stages.push({ id: 'save', kind: 'save', status: 'active' })
  }

  return stages
}

export type CampaignBriefRunStepLabels = {
  prepare: string
  generate: string
  review: (pass: number, max: number) => string
  revise: (pass: number, max: number) => string
  save: string
  starting: string
}

/** Primary status line for the active campaign-brief generation phase. */
export function campaignBriefRunStepLabel(
  step: string | null | undefined,
  iteration: number | null | undefined,
  maxRevisions: number,
  labels: CampaignBriefRunStepLabels,
): string {
  if (!step) {
    return labels.starting
  }

  const pass = Math.max(1, Math.min(maxRevisions, iteration ?? 1))

  switch (step) {
    case 'prepare_brief_context':
    case 'execute_skill':
      return labels.prepare
    case 'generate_draft':
      return labels.generate
    case 'reflect_critique':
      return labels.review(pass, maxRevisions)
    case 'reflect_revise':
      return labels.revise(pass, maxRevisions)
    case 'store_brief':
      return labels.save
    default:
      return labels.starting
  }
}

export type CampaignBriefPipelineStageLabels = {
  create: string
  review: string
  reviewAgain: string
  edit: string
  save: string
}

export function campaignBriefPipelineStageLabel(
  stage: CampaignBriefPipelineStage,
  labels: CampaignBriefPipelineStageLabels,
): string {
  switch (stage.kind) {
    case 'create':
      return labels.create
    case 'save':
      return labels.save
    case 'review':
      return stage.pass != null && stage.pass > 1 ? labels.reviewAgain : labels.review
    case 'edit':
      return labels.edit
  }
}
