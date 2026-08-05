import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { fonts, menuyuktiColors, radius, spacing, typography } from '../theme/tokens'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AppErrorBoundary', error, info.componentStack)
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: spacing.lg,
            gap: spacing.md,
            backgroundColor: menuyuktiColors.canvas,
          }}
        >
          <Text
            style={{
              ...typography.pageTitle,
              fontFamily: fonts.sansSemiBold,
              color: menuyuktiColors.ink,
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              ...typography.body,
              fontFamily: fonts.sans,
              color: menuyuktiColors.inkMuted,
            }}
            selectable
          >
            {this.state.error.message || 'An unexpected error occurred.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={this.handleRetry}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: menuyuktiColors.accent,
              paddingHorizontal: spacing.md,
              paddingVertical: 12,
              borderRadius: radius.sm,
            }}
          >
            <Text
              style={{
                ...typography.bodyMedium,
                fontFamily: fonts.sansSemiBold,
                color: menuyuktiColors.ink,
              }}
            >
              Try again
            </Text>
          </Pressable>
        </View>
      )
    }

    return this.props.children
  }
}
