import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'
import * as SplashScreen from 'expo-splash-screen'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppErrorBoundary } from './components/AppErrorBoundary'
import { RootNavigator } from './navigation/RootNavigator'
import { BrandProvider } from './theme/BrandContext'
import { SessionProvider } from './theme/SessionContext'
import { menuyuktiColors } from './theme/tokens'

void SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go / web may not support splash keep */
})

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  })

  const ready = fontsLoaded || fontError != null

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync().catch(() => undefined)
    }
  }, [ready])

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: menuyuktiColors.canvas,
        }}
      >
        <ActivityIndicator color={menuyuktiColors.accentHover} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <BrandProvider>
          <SessionProvider>
            <RootNavigator />
          </SessionProvider>
        </BrandProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  )
}
