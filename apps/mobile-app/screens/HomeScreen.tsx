import { Text, View } from 'react-native'

import { OfferCard } from '../components/OfferCard'
import { Screen } from '../components/Screen'
import { SectionHeader } from '../components/SectionHeader'
import { mockRestaurant } from '../data/mockRestaurant'
import { useBrand } from '../theme/BrandContext'

export function HomeScreen() {
  const { colors, typography, fonts, spacing } = useBrand()
  const restaurant = mockRestaurant

  return (
    <Screen scroll contentStyle={{ paddingTop: spacing.md, gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <Text
          style={{
            ...typography.caption,
            fontFamily: fonts.sansMedium,
            color: colors.inkFaint,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          {restaurant.displayName}
        </Text>
        <Text
          style={{
            ...typography.title,
            fontFamily: fonts.sansSemiBold,
            color: colors.ink,
          }}
        >
          {restaurant.greeting}
        </Text>
        <Text
          style={{
            ...typography.body,
            fontFamily: fonts.sans,
            color: colors.inkMuted,
          }}
        >
          Fresh deals curated for your next visit.
        </Text>
      </View>

      <View style={{ marginHorizontal: -spacing.lg }}>
        <OfferCard offer={restaurant.featuredOffer} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Active offers" subtitle="Show these in-store when you order." />
        {restaurant.offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </View>
    </Screen>
  )
}
