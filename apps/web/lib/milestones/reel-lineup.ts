import type {
  MenuTaggerItem,
  PromotionCandidateMenuItem,
  PromotionCandidatesMilestoneData,
  ReelLineupGroup,
  ReelLineupGroupItem,
  ReelLineupMilestoneData,
} from '@/lib/graphql/node-schemas'

import {
  REEL_LINEUP_GROUP_MAX_SIZE,
  REEL_LINEUP_GROUP_MIN_SIZE,
  REEL_LINEUP_PROFILE_ID,
  contentAngleLeadBoost,
  reelHookStrength,
} from '@/lib/milestones/reel-lineup-rules'

export type PromotionCandidateItemKey = `${string}\0${string}\0${string}`

export function promotionCandidateItemKey(
  name: string,
  role: 'star' | 'puzzle',
  category: string,
): PromotionCandidateItemKey {
  return `${name.toLocaleLowerCase()}\0${role}\0${category.toLocaleLowerCase()}` as PromotionCandidateItemKey
}

function parsePromotionCandidateItem(raw: PromotionCandidateMenuItem): PromotionCandidateMenuItem {
  return typeof raw === 'string'
    ? { name: raw, storytellingFit: 'strong', storytellingRationale: '' }
    : raw
}

/** Index promotion candidate enrichment by name+role+category. */
export function indexPromotionCandidateItems(
  data: PromotionCandidatesMilestoneData,
): Map<PromotionCandidateItemKey, PromotionCandidateMenuItem> {
  const index = new Map<PromotionCandidateItemKey, PromotionCandidateMenuItem>()
  for (const block of data.categories) {
    const category = block.category.trim() || '(uncategorized)'
    for (const role of ['star', 'puzzle'] as const) {
      const list = role === 'star' ? block.starItems : block.puzzleItems
      for (const raw of list) {
        const item = parsePromotionCandidateItem(raw)
        const name = item.name.trim()
        if (!name) continue
        index.set(promotionCandidateItemKey(name, role, category), item)
      }
    }
  }
  return index
}

type EnrichedItem = MenuTaggerItem & {
  popularity: number
  priceLevel: 1 | 2 | 3
  storytellingFit: 'strong' | 'weak'
  leadScore: number
}

function enrichItem(
  item: MenuTaggerItem,
  promotionIndex: Map<PromotionCandidateItemKey, PromotionCandidateMenuItem>,
): EnrichedItem {
  const category = item.category.trim() || '(uncategorized)'
  const promotion = promotionIndex.get(promotionCandidateItemKey(item.name, item.role, category))
  const parsed = promotion ? parsePromotionCandidateItem(promotion) : null
  const popularity = typeof parsed?.popularity === 'number' ? parsed.popularity : 0
  const priceLevel = ((parsed && 'priceLevel' in parsed ? parsed.priceLevel : undefined) ?? 2) as
    | 1
    | 2
    | 3
  const storytellingFit = parsed?.storytellingFit ?? 'weak'
  const hook = reelHookStrength(item.tags.reel_moment)
  const storytellingStrong = storytellingFit === 'strong' ? 1 : 0
  const angleBoost = contentAngleLeadBoost(item.tags.content_angle)
  const normalizedPrice = (priceLevel - 1) / 2
  const leadScore =
    item.role === 'star'
      ? 0.35 * popularity +
        0.2 * storytellingStrong +
        0.2 * hook +
        0.15 * angleBoost +
        0.1 * normalizedPrice
      : 0

  return {
    ...item,
    popularity,
    priceLevel,
    storytellingFit,
    leadScore,
  }
}

function prepStyleOverlap(a: readonly string[], b: readonly string[]): boolean {
  if (a.length === 0 || b.length === 0) return true
  const setB = new Set(b)
  return a.some((value) => setB.has(value))
}

function primaryIngredient(item: MenuTaggerItem): string | undefined {
  return item.tags.ingredient[0]
}

function countPriceLevel(levels: (1 | 2 | 3)[], level: 1 | 2 | 3): number {
  return levels.filter((value) => value === level).length
}

function countStorytellingWeak(items: EnrichedItem[]): number {
  return items.filter((item) => item.storytellingFit === 'weak').length
}

function countRole(items: EnrichedItem[], role: 'star' | 'puzzle'): number {
  return items.filter((item) => item.role === role).length
}

function canAddToGroup(group: EnrichedItem[], candidate: EnrichedItem): boolean {
  if (group.length >= REEL_LINEUP_GROUP_MAX_SIZE) return false

  const lead = group[0]!
  if (candidate.tags.reel_moment !== lead.tags.reel_moment) return false
  if (candidate.tags.serve_temp !== lead.tags.serve_temp) return false
  if (candidate.tags.kind !== lead.tags.kind) return false

  const hypothetical = [...group, candidate]
  const priceLevels = hypothetical.map((item) => item.priceLevel)
  if (countPriceLevel(priceLevels, candidate.priceLevel) > 2) return false
  if (Math.abs(candidate.priceLevel - lead.priceLevel) > 1) return false

  const primary = primaryIngredient(candidate)
  if (primary) {
    const sameIngredient = hypothetical.filter((item) => primaryIngredient(item) === primary).length
    if (sameIngredient > 2) return false
  }

  if (countStorytellingWeak(hypothetical) > 2) return false
  if (countRole(hypothetical, 'star') > 4) return false
  if (countRole(hypothetical, 'puzzle') > 3) return false

  const puzzleCount = countRole(hypothetical, 'puzzle')
  if (puzzleCount >= 2) {
    const hasStrongOrAngle = hypothetical.some(
      (item) =>
        item.storytellingFit === 'strong' ||
        item.tags.content_angle.includes('hidden_gem') ||
        item.tags.content_angle.includes('chef_pick'),
    )
    if (!hasStrongOrAngle) return false
  }

  if (hypothetical.length >= 4) {
    const distinctPrices = new Set(priceLevels).size
    if (distinctPrices < 2) return false
  }

  return true
}

function supportScore(group: EnrichedItem[], candidate: EnrichedItem): number {
  const lead = group[0]!
  let score = 0

  if (candidate.role === 'star') score += 1
  if (prepStyleOverlap(lead.tags.prep_style, candidate.tags.prep_style)) {
    score += 0.25
  }
  if (candidate.storytellingFit === 'strong') score += 0.2
  if (candidate.tags.content_angle.includes('hidden_gem')) score += 0.1
  if (candidate.priceLevel !== lead.priceLevel) score += 0.1
  score += candidate.popularity * 0.2
  return score
}

function orderGroupItems(group: EnrichedItem[]): EnrichedItem[] {
  const lead = group[0]!
  const rest = group.slice(1)
  const otherStars = rest
    .filter((item) => item.role === 'star')
    .sort((a, b) => {
      if (b.leadScore !== a.leadScore) return b.leadScore - a.leadScore
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  const puzzles = rest
    .filter((item) => item.role === 'puzzle')
    .sort((a, b) => {
      if (b.popularity !== a.popularity) return b.popularity - a.popularity
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  return [lead, ...otherStars, ...puzzles]
}

function toGroupItem(item: EnrichedItem, position: number): ReelLineupGroupItem {
  return {
    name: item.name,
    role: item.role,
    category: item.category,
    position,
    popularity: item.popularity,
    priceLevel: item.priceLevel,
    storytellingFit: item.storytellingFit,
    reelMoment: item.tags.reel_moment,
  }
}

function buildGroupMix(items: EnrichedItem[]): ReelLineupGroup['mix'] {
  return {
    priceLevels: items.map((item) => item.priceLevel),
    storytellingStrongCount: items.filter((item) => item.storytellingFit === 'strong').length,
    starCount: countRole(items, 'star'),
    puzzleCount: countRole(items, 'puzzle'),
  }
}

function finalizeGroup(group: EnrichedItem[], index: number): ReelLineupGroup {
  const ordered = orderGroupItems(group)
  const lead = ordered[0]!
  return {
    id: `group-${index + 1}`,
    leadName: lead.name,
    profileId: REEL_LINEUP_PROFILE_ID,
    anchor: {
      dimension: 'reel_moment',
      value: lead.tags.reel_moment,
    },
    items: ordered.map((item, position) => toGroupItem(item, position + 1)),
    mix: buildGroupMix(ordered),
  }
}

export type BuildReelLineupInput = {
  menuTaggerItems: MenuTaggerItem[]
  promotionCandidates: PromotionCandidatesMilestoneData
  sourceMenuTaggerTitle?: string
  notes?: string
}

export function buildReelLineup(input: BuildReelLineupInput): ReelLineupMilestoneData {
  const promotionIndex = indexPromotionCandidateItems(input.promotionCandidates)
  const enriched = input.menuTaggerItems.map((item) => enrichItem(item, promotionIndex))

  const assigned = new Set<PromotionCandidateItemKey>()
  const groups: ReelLineupGroup[] = []

  const stars = enriched
    .filter((item) => item.role === 'star')
    .sort((a, b) => {
      if (b.leadScore !== a.leadScore) return b.leadScore - a.leadScore
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })

  let groupIndex = 0
  for (const lead of stars) {
    const leadKey = promotionCandidateItemKey(
      lead.name,
      lead.role,
      lead.category.trim() || '(uncategorized)',
    )
    if (assigned.has(leadKey)) continue

    const group: EnrichedItem[] = [lead]
    assigned.add(leadKey)

    while (group.length < REEL_LINEUP_GROUP_MAX_SIZE) {
      const candidates = enriched
        .filter((item) => {
          const key = promotionCandidateItemKey(
            item.name,
            item.role,
            item.category.trim() || '(uncategorized)',
          )
          return !assigned.has(key) && canAddToGroup(group, item)
        })
        .sort((a, b) => {
          const scoreDiff = supportScore(group, b) - supportScore(group, a)
          if (scoreDiff !== 0) return scoreDiff
          if (a.role !== b.role) return a.role === 'star' ? -1 : 1
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        })

      const next = candidates[0]
      if (!next) break

      const key = promotionCandidateItemKey(
        next.name,
        next.role,
        next.category.trim() || '(uncategorized)',
      )
      group.push(next)
      assigned.add(key)
    }

    if (group.length >= REEL_LINEUP_GROUP_MIN_SIZE) {
      groups.push(finalizeGroup(group, groupIndex))
      groupIndex += 1
    } else {
      for (const item of group) {
        assigned.delete(
          promotionCandidateItemKey(
            item.name,
            item.role,
            item.category.trim() || '(uncategorized)',
          ),
        )
      }
    }
  }

  const unassignedItemNames = enriched
    .filter((item) => {
      const key = promotionCandidateItemKey(
        item.name,
        item.role,
        item.category.trim() || '(uncategorized)',
      )
      return !assigned.has(key)
    })
    .map((item) => item.name)

  const payload: ReelLineupMilestoneData = {
    groups,
    unassignedItemNames,
  }
  if (input.sourceMenuTaggerTitle?.trim()) {
    payload.sourceMenuTaggerTitle = input.sourceMenuTaggerTitle.trim()
  }
  if (input.notes?.trim()) {
    payload.notes = input.notes.trim()
  }
  return payload
}

export const EMPTY_REEL_LINEUP_DATA: ReelLineupMilestoneData = {
  groups: [],
  unassignedItemNames: [],
}
