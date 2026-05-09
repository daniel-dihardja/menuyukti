import { CalendarRange, ClipboardList, Lightbulb, ListChecks, Milestone } from 'lucide-react'

import type { MilestonePresetId } from '@/lib/milestones/preset-definitions'

export function milestonePresetIconFor(presetId?: MilestonePresetId) {
  switch (presetId) {
    case 'dates':
      return CalendarRange
    case 'restaurant_campaign_brief':
      return ClipboardList
    case 'post_scheduler':
      return Milestone
    case 'promotion_candidates':
      return ListChecks
    case 'culture_hooks':
      return Lightbulb
    default:
      return Milestone
  }
}
