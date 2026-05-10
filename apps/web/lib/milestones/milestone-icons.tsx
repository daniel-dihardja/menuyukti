import {
  CalendarRange,
  ClipboardList,
  Lightbulb,
  ListChecks,
  Milestone,
  PieChart,
} from 'lucide-react'

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
    case 'format_mix':
      return PieChart
    default:
      return Milestone
  }
}
