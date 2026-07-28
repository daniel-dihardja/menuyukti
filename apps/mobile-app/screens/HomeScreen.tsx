import { Pressable, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'

import { Screen } from '../components/Screen'
import type { MainTabParamList } from '../navigation/MainTabs'
import { useBrand } from '../theme/BrandContext'
import { useSession } from '../theme/SessionContext'

export function HomeScreen() {
  const { name, colors, radius, typography, fonts, spacing, shadow } = useBrand()
  const { profile } = useSession()
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>()

  const firstName = profile.givenName.trim()
  const greeting = firstName ? `Welcome back, ${firstName}` : 'Welcome'

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
          {name}
        </Text>
        <Text
          style={{
            ...typography.title,
            fontFamily: fonts.sansSemiBold,
            color: colors.ink,
          }}
        >
          {greeting}
        </Text>
        <Text
          style={{
            ...typography.body,
            fontFamily: fonts.sans,
            color: colors.inkMuted,
          }}
        >
          You’re enrolled. Cashback from qualifying visits shows up in your balance.
        </Text>
      </View>

      <View
        style={[
          shadow.warmSm,
          {
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            gap: spacing.sm,
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
            Cashback
          </Text>
          <Text
            style={{
              ...typography.caption,
              fontFamily: fonts.sans,
              color: colors.inkMuted,
            }}
          >
            Check your balance and history anytime on the Cashback tab.
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="View cashback"
          onPress={() => navigation.navigate('Rewards')}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: 'flex-start' })}
        >
          <Text
            style={{
              ...typography.caption,
              fontFamily: fonts.sansMedium,
              color: colors.inkFaint,
              textDecorationLine: 'underline',
            }}
          >
            View cashback
          </Text>
        </Pressable>
      </View>
    </Screen>
  )
}
