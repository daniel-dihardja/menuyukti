import { Text, View } from 'react-native'

import { useBrand } from '../theme/BrandContext'

type SectionHeaderProps = {
  title: string
  subtitle?: string
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  const { colors, typography, fonts, spacing } = useBrand()

  return (
    <View style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
      <Text
        style={{
          ...typography.heading,
          fontFamily: fonts.sansSemiBold,
          color: colors.ink,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            ...typography.body,
            fontFamily: fonts.sans,
            color: colors.inkMuted,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}
