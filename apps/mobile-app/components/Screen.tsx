import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

import { useBrand } from '../theme/BrandContext'

type ScreenProps = {
  children: ReactNode
  scroll?: boolean
  style?: ViewStyle
  contentStyle?: ViewStyle
  keyboardAvoiding?: boolean
}

export function Screen({
  children,
  scroll = false,
  style,
  contentStyle,
  keyboardAvoiding = false,
}: ScreenProps) {
  const { colors, spacing } = useBrand()

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
        contentStyle,
      ]}
    >
      {children}
    </View>
  )

  const wrapped = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  )

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.canvas }, style]} edges={['top']}>
      <StatusBar style="dark" />
      {wrapped}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, gap: 12 },
  scrollContent: { flexGrow: 1, gap: 12, paddingTop: 8 },
})
