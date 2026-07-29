import { Text, View } from 'react-native'

import { useBrand } from '../theme/BrandContext'

type PointsBadgeProps = {
  points: number
  label?: string
}

export function PointsBadge({ points, label = 'points' }: PointsBadgeProps) {
  const { colors, radius, typography, fonts, spacing } = useBrand()

  return (
    <View
      style={{
        backgroundColor: colors.accentSoft,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        gap: spacing.xs,
      }}
    >
      <Text
        style={{
          fontSize: 36,
          lineHeight: 42,
          fontFamily: fonts.sansBold,
          color: colors.ink,
        }}
      >
        {points}
      </Text>
      <Text
        style={{
          ...typography.label,
          fontFamily: fonts.sansMedium,
          color: colors.inkMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Text>
    </View>
  )
}

type StampCardProps = {
  collected: number
  total: number
  title: string
}

export function StampCard({ collected, total, title }: StampCardProps) {
  const { colors, radius, typography, fonts, spacing } = useBrand()
  const stamps = Array.from({ length: total }, (_, i) => i < collected)

  return (
    <View
      accessibilityLabel={`${title}: ${collected} of ${total} stamps collected`}
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.md,
      }}
    >
      <Text
        style={{
          ...typography.bodyMedium,
          fontFamily: fonts.sansSemiBold,
          color: colors.ink,
        }}
      >
        {title}
      </Text>
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
      >
        {stamps.map((filled, index) => (
          <View
            key={index}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: filled ? colors.accent : colors.surface,
              borderWidth: 1,
              borderColor: filled ? colors.accentHover : colors.borderStrong,
            }}
          />
        ))}
      </View>
      <Text
        style={{
          ...typography.caption,
          fontFamily: fonts.sans,
          color: colors.inkMuted,
        }}
      >
        {collected} of {total} stamps
      </Text>
    </View>
  )
}
