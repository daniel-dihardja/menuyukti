import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'

import { useBrand } from '../theme/BrandContext'

type TextFieldProps = TextInputProps & {
  label: string
  error?: string | null
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const { colors, radius, typography, fonts, spacing } = useBrand()

  return (
    <View style={{ gap: spacing.xs }}>
      <Text
        style={{
          ...typography.label,
          fontFamily: fonts.sansMedium,
          color: colors.ink,
        }}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.inkFaint}
        style={[
          styles.input,
          {
            borderColor: error ? colors.destructive : colors.border,
            borderRadius: radius.md,
            backgroundColor: colors.card,
            color: colors.ink,
            fontFamily: fonts.sans,
            ...typography.body,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text
          style={{
            ...typography.caption,
            fontFamily: fonts.sans,
            color: colors.destructive,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
})
