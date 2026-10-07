import { getTranslations } from 'next-intl/server'

import type { MyPointBalance, MyPointEntry } from '@/lib/graphql/queries/point-ledger'

type Props = {
  balances: MyPointBalance[]
  entries: MyPointEntry[]
  loadError?: boolean
}

function formatEntryDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export async function CustomerPointsSection({ balances, entries, loadError = false }: Props) {
  const t = await getTranslations('guestHome')
  const total = balances.reduce((sum, row) => sum + row.balance, 0)
  const hasData = balances.length > 0 || entries.length > 0

  const actionLabel = (actionKey: string): string => {
    if (actionKey === 'open_menu_qr') return t('actions.open_menu_qr')
    if (actionKey === 'complete_order') return t('actions.complete_order')
    return actionKey
  }

  return (
    <section
      aria-labelledby="customer-home-rewards-heading"
      className="rounded-lg border border-border bg-canvas/40 px-4 py-5 sm:px-5"
    >
      <h2 id="customer-home-rewards-heading" className="text-base font-semibold tracking-tight">
        {t('rewardsTitle')}
      </h2>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
        {t('rewardsLead')}
      </p>

      {loadError ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('rewardsLoadError')}</p>
      ) : !hasData ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('rewardsEmpty')}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('rewardsTotalLabel')}
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">{total}</span>
              <span className="text-sm text-muted-foreground">{t('rewardsTotalUnit')}</span>
            </p>
          </div>

          {balances.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{t('rewardsByVenueTitle')}</h3>
              <ul className="divide-y divide-border rounded-md border border-border">
                {balances.map((row) => (
                  <li
                    key={row.locationId}
                    className="flex items-baseline justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">{row.locationName}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {row.balance} {t('rewardsTotalUnit')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t('rewardsHistoryTitle')}</h3>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('rewardsHistoryEmpty')}</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 px-3 py-2.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate font-medium">
                        {entry.label?.trim() || actionLabel(entry.actionKey)}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        +{entry.amount}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.locationName} · {formatEntryDate(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
