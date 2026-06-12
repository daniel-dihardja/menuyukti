export type CampaignObjective = 'awareness' | 'consideration' | 'conversion'

export type PrimaryCtaChannel = 'profile_visit' | 'dm' | 'order_or_reservation'

const OBJECTIVE_KEYS: Record<CampaignObjective, string> = {
  awareness: 'objectives.awareness',
  consideration: 'objectives.consideration',
  conversion: 'objectives.conversion',
}

const CTA_KEYS: Record<PrimaryCtaChannel, string> = {
  profile_visit: 'cta.profileVisit',
  dm: 'cta.dm',
  order_or_reservation: 'cta.orderOrReservation',
}

export function objectiveMessageKey(value: string): string {
  if (value in OBJECTIVE_KEYS) {
    return OBJECTIVE_KEYS[value as CampaignObjective]
  }
  return 'objectives.unknown'
}

export function primaryCtaMessageKey(value: string): string {
  if (value in CTA_KEYS) {
    return CTA_KEYS[value as PrimaryCtaChannel]
  }
  return 'cta.unknown'
}

export function formatPeakHour(hour: number | null | undefined, locale: string): string | null {
  if (hour == null || Number.isNaN(hour)) return null
  const clamped = Math.max(0, Math.min(23, Math.trunc(hour)))
  const date = new Date(Date.UTC(2000, 0, 1, clamped, 0, 0))
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date)
}

export function formatSharePercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatChangePercent(
  value: number | null | undefined,
  locale: string,
): string | null {
  if (value == null || Number.isNaN(value)) return null
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(value)
}

export function confidenceTierVariant(
  tier: string,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (tier.toLowerCase()) {
    case 'high':
      return 'default'
    case 'medium':
      return 'secondary'
    default:
      return 'outline'
  }
}
