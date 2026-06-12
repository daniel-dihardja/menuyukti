import type { MilestoneInput } from '@/lib/graphql/node-schemas'
import { campaignBriefMilestoneInputValueSchema } from '@/lib/graphql/node-schemas'

export const DEFAULT_CAMPAIGN_BRIEF_REFLECTION = {
  enabled: true,
  maxRevisions: 2,
} as const

export type CampaignBriefInputDraft = {
  notes: string
  reflection: {
    enabled: boolean
    maxRevisions: number
  }
}

export function campaignBriefInputFromMilestoneInput(
  raw: MilestoneInput | undefined,
): CampaignBriefInputDraft {
  if (
    raw?.type !== 'restaurant_campaign_brief' ||
    raw.value == null ||
    typeof raw.value !== 'object'
  ) {
    return {
      notes: '',
      reflection: { ...DEFAULT_CAMPAIGN_BRIEF_REFLECTION },
    }
  }
  const parsed = campaignBriefMilestoneInputValueSchema.safeParse(raw.value)
  if (!parsed.success) {
    const legacyNotes = (raw.value as { notes?: unknown }).notes
    return {
      notes: typeof legacyNotes === 'string' ? legacyNotes : '',
      reflection: { ...DEFAULT_CAMPAIGN_BRIEF_REFLECTION },
    }
  }
  return {
    notes: parsed.data.notes,
    reflection: {
      enabled: parsed.data.reflection?.enabled ?? DEFAULT_CAMPAIGN_BRIEF_REFLECTION.enabled,
      maxRevisions:
        parsed.data.reflection?.maxRevisions ?? DEFAULT_CAMPAIGN_BRIEF_REFLECTION.maxRevisions,
    },
  }
}

export function normalizeCampaignBriefInput(
  draft: CampaignBriefInputDraft,
): CampaignBriefInputDraft {
  const maxRevisions = Math.min(3, Math.max(0, Math.trunc(draft.reflection.maxRevisions)))
  return {
    notes: draft.notes.trim(),
    reflection: {
      enabled: draft.reflection.enabled,
      maxRevisions,
    },
  }
}

export function normalizedCampaignBriefInputsEqual(
  a: CampaignBriefInputDraft,
  b: CampaignBriefInputDraft,
): boolean {
  return (
    a.notes === b.notes &&
    a.reflection.enabled === b.reflection.enabled &&
    a.reflection.maxRevisions === b.reflection.maxRevisions
  )
}
