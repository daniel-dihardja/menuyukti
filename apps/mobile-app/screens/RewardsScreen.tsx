import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

import { Button } from '../components/Button'
import { Screen } from '../components/Screen'
import { SectionHeader } from '../components/SectionHeader'
import { fetchCashbackOverview, type CashbackOverview } from '../lib/cashback'
import { formatIdr } from '../lib/formatCurrency'
import { useBrand } from '../theme/BrandContext'
import { useSession } from '../theme/SessionContext'

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function RewardsScreen() {
  const { colors, radius, typography, fonts, spacing, shadow } = useBrand()
  const { session } = useSession()
  const deviceId = session?.deviceId

  const [overview, setOverview] = useState<CashbackOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => Boolean(session?.deviceId))
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!deviceId) return

    let cancelled = false

    void fetchCashbackOverview(deviceId)
      .then((next) => {
        if (cancelled) return
        setOverview(next)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setOverview(null)
        setError(err instanceof Error ? err.message : 'Could not load cashback.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [deviceId, reloadKey])

  const signedOutError = deviceId ? null : 'Sign in again to view cashback.'
  const displayError = signedOutError ?? error
  const showLoading = Boolean(deviceId) && loading

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setReloadKey((key) => key + 1)
  }

  const configLine =
    overview && overview.config.percent > 0
      ? `Earn ${overview.config.percent}% on payments from ${formatIdr(overview.config.thresholdAmount)}.`
      : null

  return (
    <Screen scroll contentStyle={{ paddingTop: spacing.md, gap: spacing.lg }}>
      <SectionHeader
        title="Your cashback"
        subtitle={configLine ?? 'Cashback from your visits appears here.'}
      />

      {showLoading ? (
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator color={colors.accentHover} />
        </View>
      ) : displayError ? (
        <View
          style={[
            shadow.warmSm,
            {
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              gap: spacing.md,
            },
          ]}
        >
          <Text
            style={{
              ...typography.body,
              fontFamily: fonts.sans,
              color: colors.inkMuted,
            }}
          >
            {displayError}
          </Text>
          {deviceId ? <Button title="Try again" variant="secondary" onPress={handleRetry} /> : null}
        </View>
      ) : overview ? (
        <>
          <View
            style={[
              shadow.warmSm,
              {
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.lg,
                gap: spacing.xs,
              },
            ]}
          >
            <Text
              style={{
                ...typography.caption,
                fontFamily: fonts.sansMedium,
                color: colors.inkMuted,
              }}
            >
              Balance
            </Text>
            <Text
              style={{
                ...typography.title,
                fontFamily: fonts.sansSemiBold,
                color: colors.ink,
              }}
            >
              {formatIdr(overview.balance)}
            </Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            <SectionHeader
              title="History"
              subtitle={
                overview.entries.length === 0
                  ? 'No cashback yet — it will show up after qualifying visits.'
                  : 'Recent cashback credits.'
              }
            />
            {overview.entries.map((entry) => (
              <View
                key={entry.id}
                style={[
                  shadow.warmSm,
                  {
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    gap: spacing.xs,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      ...typography.bodyMedium,
                      fontFamily: fonts.sansSemiBold,
                      color: colors.ink,
                      flex: 1,
                    }}
                  >
                    {entry.label?.trim() || 'Cashback'}
                  </Text>
                  <Text
                    style={{
                      ...typography.label,
                      fontFamily: fonts.sansMedium,
                      color: entry.amount < 0 ? colors.destructive : colors.accentHover,
                    }}
                  >
                    {formatIdr(entry.amount)}
                  </Text>
                </View>
                <Text
                  style={{
                    ...typography.caption,
                    fontFamily: fonts.sans,
                    color: colors.inkMuted,
                  }}
                >
                  {formatDate(entry.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  )
}
