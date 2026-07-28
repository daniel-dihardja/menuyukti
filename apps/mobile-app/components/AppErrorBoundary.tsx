import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { menuyuktiColors } from '../theme/tokens'

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
            padding: 24,
            gap: 16,
            backgroundColor: menuyuktiColors.canvas,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: '600',
              color: menuyuktiColors.ink,
            }}
          >
            Something went wrong
          </Text>
          <Text style={{ fontSize: 16, color: menuyuktiColors.inkMuted, lineHeight: 22 }}>
            {this.state.error.message || 'An unexpected error occurred.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={this.handleRetry}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: menuyuktiColors.accent,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontWeight: '600', color: menuyuktiColors.ink }}>Try again</Text>
          </Pressable>
        </View>
      )
    }

    return this.props.children
  }
}
