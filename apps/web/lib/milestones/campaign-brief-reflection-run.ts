export type CampaignBriefReflectionCritiqueItem = {
  criterionId: string
  qualityPass: boolean
  feedback: string
}

export type CampaignBriefReflectionRound = {
  iteration: number
  critiques: CampaignBriefReflectionCritiqueItem[]
}

export function upsertReflectionRound(
  rounds: CampaignBriefReflectionRound[],
  next: CampaignBriefReflectionRound,
): CampaignBriefReflectionRound[] {
  const without = rounds.filter((round) => round.iteration !== next.iteration)
  return [...without, next].toSorted((a, b) => a.iteration - b.iteration)
}

export function reflectionRoundSummary(round: CampaignBriefReflectionRound): {
  passCount: number
  failCount: number
  total: number
} {
  const passCount = round.critiques.filter((row) => row.qualityPass).length
  const failCount = round.critiques.length - passCount
  return { passCount, failCount, total: round.critiques.length }
}

export function parseReflectionCritiqueSummaryPayload(
  payload: Record<string, unknown>,
): CampaignBriefReflectionRound | null {
  const iteration = payload.iteration
  const critiquesRaw = payload.critiques
  if (
    typeof iteration !== 'number' ||
    !Number.isFinite(iteration) ||
    !Array.isArray(critiquesRaw)
  ) {
    return null
  }
  const critiques: CampaignBriefReflectionCritiqueItem[] = []
  for (const row of critiquesRaw) {
    if (row == null || typeof row !== 'object') {
      continue
    }
    const record = row as Record<string, unknown>
    const criterionId = typeof record.id === 'string' ? record.id : ''
    if (!criterionId) {
      continue
    }
    critiques.push({
      criterionId,
      qualityPass: record.quality_pass === true,
      feedback: typeof record.feedback === 'string' ? record.feedback.trim() : '',
    })
  }
  if (critiques.length === 0) {
    return null
  }
  return { iteration, critiques }
}
