import { Text, View } from 'react-native'

import { Button } from '../components/Button'
import { Screen } from '../components/Screen'
import { SectionHeader } from '../components/SectionHeader'
import { PointsBadge, StampCard } from '../components/StampCard'
import { mockRestaurant } from '../data/mockRestaurant'
import { useBrand } from '../theme/BrandContext'

export function RewardsScreen() {
  const { colors, radius, typography, fonts, spacing, shadow } = useBrand()
  const { points, stampCard, rewards } = mockRestaurant

  return (
    <Screen scroll contentStyle={{ paddingTop: spacing.md, gap: spacing.lg }}>
      <SectionHeader title="Your rewards" subtitle="Earn points and stamps every time you visit." />

      <PointsBadge points={points} />

      <StampCard title={stampCard.title} collected={stampCard.collected} total={stampCard.total} />

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Redeem" subtitle="Demo only — redemption is not live yet." />
        {rewards.map((reward) => {
          const canRedeem = points >= reward.pointsCost
          return (
            <View
              key={reward.id}
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
              <View style={{ gap: spacing.xs }}>
                <Text
                  style={{
                    ...typography.bodyMedium,
                    fontFamily: fonts.sansSemiBold,
                    color: colors.ink,
                  }}
                >
                  {reward.title}
                </Text>
                <Text
                  style={{
                    ...typography.caption,
                    fontFamily: fonts.sans,
                    color: colors.inkMuted,
                  }}
                >
                  {reward.description}
                </Text>
                <Text
                  style={{
                    ...typography.label,
                    fontFamily: fonts.sansMedium,
                    color: colors.accentHover,
                  }}
                >
                  {reward.pointsCost} points
                </Text>
              </View>
              <Button
                title={canRedeem ? 'Redeem' : 'Not enough points'}
                variant={canRedeem ? 'primary' : 'secondary'}
                disabled={!canRedeem}
                onPress={() => undefined}
              />
            </View>
          )
        })}
      </View>
    </Screen>
  )
}
