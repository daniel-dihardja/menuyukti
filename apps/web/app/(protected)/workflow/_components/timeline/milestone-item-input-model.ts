import type { FieldSaveStatusVariant } from '@/components/field-save-status'
import type { CampaignBriefInputDraft } from '@/lib/milestones/campaign-brief-input'

import type { MilestoneCampaignBriefInputProps } from './milestone-campaign-brief-input'
import type { MenuClustererInputDraft } from './milestone-menu-clusterer-input'
import type { IgMenuPickerInputDraft } from './milestone-ig-menu-picker-input'
import type { PromotionCandidatesInputDraft } from './milestone-promotion-candidates-input'

export type CampaignWindowInput = {
  startDate: string
  endDate: string
}

export type MilestoneInputModel =
  | {
      type: 'dates'
      draft: CampaignWindowInput
      setDraft: (next: CampaignWindowInput) => void
      saveStatus: FieldSaveStatusVariant
      saving: boolean
    }
  | {
      type: 'promotion_candidates'
      draft: PromotionCandidatesInputDraft
      onChange: (next: PromotionCandidatesInputDraft) => void
      onNotesBlur: () => void
      onNotesFocus: () => void
      mainCategory: string | null
      saveStatus: FieldSaveStatusVariant
      saving: boolean
    }
  | {
      type: 'campaign_brief'
      draft: CampaignBriefInputDraft
      onChange: MilestoneCampaignBriefInputProps['onDraftChange']
      onNotesBlur: () => void
      onNotesFocus: () => void
      saveStatus: FieldSaveStatusVariant
      saving: boolean
    }
  | {
      type: 'menu_clusterer'
      draft: MenuClustererInputDraft
      onChange: (next: MenuClustererInputDraft) => void
      onNotesBlur: () => void
      onNotesFocus: () => void
      saveStatus: FieldSaveStatusVariant
      saving: boolean
    }
  | {
      type: 'ig_menu_picker'
      milestoneId: string
      draft: IgMenuPickerInputDraft
      onChange: (next: IgMenuPickerInputDraft) => void
      onNotesBlur: () => void
      onNotesFocus: () => void
      saveStatus: FieldSaveStatusVariant
      saving: boolean
    }
  | {
      type: 'optional_notes'
      draft: string
      setDraft: (v: string) => void
      onBlur: () => void
      onFocus: () => void
      copy: {
        label: string
        description: string
        placeholder: string
      }
      saveStatus: FieldSaveStatusVariant
      saving: boolean
    }
  | { type: 'none' }
