import { Pressable, Text, View } from 'react-native'

import { useBrand } from '../theme/BrandContext'

export type Offer = {
  id: string
  title: string
  description: string
  badge?: string
  featured?: boolean
}

type OfferCardProps = {
  offer: Offer
  onPress?: () => void
}

export function OfferCard({ offer, onPress }: OfferCardProps) {
  const { colors, radius, typography, fonts, spacing, shadow } = useBrand()
  const interactive = typeof onPress === 'function'

  const content = offer.featured ? (
    <>
      {offer.badge ? (
        <Text
          style={{
            ...typography.caption,
            fontFamily: fonts.sansMedium,
            color: colors.ink,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          {offer.badge}
        </Text>
      ) : null}
      <Text
        style={{
          ...typography.heading,
          fontFamily: fonts.sansBold,
          color: colors.ink,
        }}
      >
        {offer.title}
      </Text>
      <Text
        style={{
          ...typography.body,
          fontFamily: fonts.sans,
          color: colors.ink,
          opacity: 0.85,
        }}
      >
        {offer.description}
      </Text>
    </>
  ) : (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text
          style={{
            ...typography.bodyMedium,
            fontFamily: fonts.sansSemiBold,
            color: colors.ink,
            flex: 1,
          }}
        >
          {offer.title}
        </Text>
        {offer.badge ? (
          <Text
            style={{
              ...typography.caption,
              fontFamily: fonts.sansMedium,
              color: colors.accentHover,
            }}
          >
            {offer.badge}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          ...typography.caption,
          fontFamily: fonts.sans,
          color: colors.inkMuted,
        }}
      >
        {offer.description}
      </Text>
    </>
  )

  const a11yLabel = `${offer.title}. ${offer.description}`

  if (offer.featured) {
    if (interactive) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          onPress={onPress}
          style={({ pressed }) => [
            {
              backgroundColor: colors.accent,
              padding: spacing.lg,
              opacity: pressed ? 0.92 : 1,
              gap: spacing.sm,
            },
          ]}
        >
          {content}
        </Pressable>
      )
    }
    return (
      <View
        accessible
        accessibilityLabel={a11yLabel}
        style={{
          backgroundColor: colors.accent,
          padding: spacing.lg,
          gap: spacing.sm,
        }}
      >
        {content}
      </View>
    )
  }

  if (interactive) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={onPress}
        style={({ pressed }) => [
          shadow.warmSm,
          {
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            gap: spacing.xs,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        {content}
      </Pressable>
    )
  }

  return (
    <View
      accessible
      accessibilityLabel={a11yLabel}
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
      {content}
    </View>
  )
}
