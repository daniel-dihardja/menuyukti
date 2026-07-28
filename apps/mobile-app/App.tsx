import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { RootNavigator } from './navigation/RootNavigator'
import { BrandProvider } from './theme/BrandContext'
import { SessionProvider } from './theme/SessionContext'
import { menuyuktiColors } from './theme/tokens'

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (fontsLoaded) setReady(true)
  }, [fontsLoaded])

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
      <BrandProvider>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </BrandProvider>
    </SafeAreaProvider>
  )
}
