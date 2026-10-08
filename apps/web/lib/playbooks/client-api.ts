import { apiFetch } from '@/lib/api/client-fetch'
import type { PublicHolidayItem } from '@/lib/graphql/queries/analytics'
import type { Playbook } from '@/lib/graphql/queries/playbooks'

export type { Playbook }

export type HolidayRelevanceResult = {
  id: string
  date: string
  name: string
  relevant: boolean
}

export type StoryDraftResult = {
  caption: string
}

export type CritiqueConfig = {
  prompt: string
  maxIterations: number
  minScore: number
}

export type CritiqueVerdict = {
  score: number
  feedback: string
  passed: boolean
}

export type CritiqueRound = {
  draft: StoryDraftResult
  verdict: CritiqueVerdict
}

export type CritiqueSummary = {
  rounds: CritiqueRound[]
  finalScore: number
  passed: boolean
}

export type HolidayStoryDraftItem = {
  id: string
  date: string
  name: string
  result: StoryDraftResult
  critique?: CritiqueSummary
}

export type StyleAnalysisResult = {
  summary: string
  palette: string
  lighting: string
  medium: string
  avoid: string
}

export type VisualBriefResult = {
  scene: string
  mood: string
  composition: string
  leonardoPrompt: string
}

export type VisualBriefItem = {
  id: string
  date: string
  name: string
  result: VisualBriefResult
}

export type ArtworkGenerateResult = {
  url: string
  name: string
  mediaS3Key: string
  size: number
  createdAt: string
}

/** Leonardo generation API rejects prompts over this length. */
export const LEONARDO_PROMPT_MAX_CHARS = 1500

export async function fetchHolidays(params: {
  locationId: number
  dateStart: string
  dateEnd: string
}): Promise<PublicHolidayItem[]> {
  const searchParams = new URLSearchParams({
    locationId: String(params.locationId),
    dateStart: params.dateStart,
    dateEnd: params.dateEnd,
  })
  const result = await apiFetch<{ holidays: PublicHolidayItem[] }>(
    `/api/holidays?${searchParams.toString()}`,
    { method: 'GET' },
    'Failed to load holidays',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.holidays
}

export async function scoreHolidayRelevance(params: {
  locationId: number
  holidays: Array<{
    id: string
    date: string
    name: string
    localName?: string
  }>
  instructions?: string
}): Promise<HolidayRelevanceResult[]> {
  const instructions = params.instructions?.trim()
  const result = await apiFetch<{ holidays: HolidayRelevanceResult[] }>(
    '/api/playbooks/public-holidays/relevance',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: params.locationId,
        holidays: params.holidays,
        ...(instructions ? { instructions } : {}),
      }),
    },
    'Failed to score holiday relevance',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.holidays
}

export async function draftHolidayStory(params: {
  locationId: number
  holiday: {
    id: string
    date: string
    name: string
    localName?: string
  }
  instructions?: string
  previousResult?: StoryDraftResult
  feedback?: string
  critique?: CritiqueConfig
}): Promise<HolidayStoryDraftItem> {
  const instructions = params.instructions?.trim()
  const feedback = params.feedback?.trim()
  const critiquePrompt = params.critique?.prompt.trim()
  const result = await apiFetch<HolidayStoryDraftItem>(
    '/api/playbooks/public-holidays/draft-story',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: params.locationId,
        holiday: {
          id: params.holiday.id,
          date: params.holiday.date,
          name: params.holiday.name,
          ...(params.holiday.localName ? { localName: params.holiday.localName } : {}),
        },
        ...(instructions ? { instructions } : {}),
        ...(params.previousResult && feedback
          ? {
              previousResult: params.previousResult,
              feedback,
            }
          : {}),
        ...(params.critique && critiquePrompt
          ? {
              critique: {
                prompt: critiquePrompt,
                maxIterations: params.critique.maxIterations,
                minScore: params.critique.minScore,
              },
            }
          : {}),
      }),
    },
    'Failed to draft holiday story',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}

export async function analyzeHolidayStyle(params: {
  styleImageName: string
  instructions?: string
}): Promise<StyleAnalysisResult> {
  const instructions = params.instructions?.trim()
  const result = await apiFetch<StyleAnalysisResult>(
    '/api/playbooks/public-holidays/analyze-style',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        styleImageName: params.styleImageName,
        ...(instructions ? { instructions } : {}),
      }),
    },
    'Failed to analyze style',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}

export async function draftHolidayVisualBrief(params: {
  locationId: number
  holiday: {
    id: string
    date: string
    name: string
    localName?: string
  }
  storyDraft: StoryDraftResult
  styleAnalysis: StyleAnalysisResult
  instructions?: string
  previousResult?: VisualBriefResult
  feedback?: string
}): Promise<VisualBriefItem> {
  const instructions = params.instructions?.trim()
  const feedback = params.feedback?.trim()
  const result = await apiFetch<VisualBriefItem>(
    '/api/playbooks/public-holidays/visual-brief',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: params.locationId,
        holiday: {
          id: params.holiday.id,
          date: params.holiday.date,
          name: params.holiday.name,
          ...(params.holiday.localName ? { localName: params.holiday.localName } : {}),
        },
        storyDraft: params.storyDraft,
        styleAnalysis: params.styleAnalysis,
        ...(instructions ? { instructions } : {}),
        ...(params.previousResult && feedback
          ? {
              previousResult: params.previousResult,
              feedback,
            }
          : {}),
      }),
    },
    'Failed to draft visual brief',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}

export async function generateHolidayArtwork(params: {
  prompt: string
  styleImageName: string
}): Promise<ArtworkGenerateResult> {
  const result = await apiFetch<ArtworkGenerateResult>(
    '/api/playbooks/public-holidays/generate-artwork',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        styleImageName: params.styleImageName,
      }),
    },
    'Failed to generate artwork',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}

export async function listPlaybooks(playbookType: string): Promise<Playbook[]> {
  const params = new URLSearchParams({ playbookType })
  const result = await apiFetch<{ playbooks: Playbook[] }>(
    `/api/playbooks?${params.toString()}`,
    { method: 'GET' },
    'Failed to list playbooks',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.playbooks
}

export async function createPlaybook(input: {
  locationId: number
  name: string
  playbookType: string
  startDate: string
  endDate: string
}): Promise<Playbook> {
  const result = await apiFetch<{ playbook: Playbook }>(
    '/api/playbooks',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to create playbook',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.playbook
}

export async function updatePlaybook(
  id: number,
  input: {
    locationId: number
    name: string
    startDate: string
    endDate: string
  },
): Promise<Playbook> {
  const result = await apiFetch<{ playbook: Playbook }>(
    `/api/playbooks/${encodeURIComponent(String(id))}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to update playbook',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.playbook
}

export async function deletePlaybook(id: number): Promise<void> {
  const result = await apiFetch<{ ok: boolean }>(
    `/api/playbooks/${encodeURIComponent(String(id))}`,
    { method: 'DELETE' },
    'Failed to delete playbook',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
}
