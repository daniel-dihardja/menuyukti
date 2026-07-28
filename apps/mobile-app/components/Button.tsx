import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native'

import { useBrand } from '../theme/BrandContext'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = PressableProps & {
  title: string
  loading?: boolean
  variant?: ButtonVariant
}

export function Button({
  title,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors, radius, typography, fonts } = useBrand()
  const isDisabled = disabled || loading

  const backgroundColor =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.surface : 'transparent'

  const textColor = colors.ink
  const borderColor = variant === 'secondary' ? colors.borderStrong : 'transparent'

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        {
          backgroundColor:
            state.pressed && variant === 'primary' ? colors.accentHover : backgroundColor,
          borderRadius: radius.button,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor,
          opacity: isDisabled ? 0.5 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={{
            ...typography.bodyMedium,
            fontFamily: fonts.sansSemiBold,
            color: textColor,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
