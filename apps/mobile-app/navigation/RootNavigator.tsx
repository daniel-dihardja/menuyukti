import { ActivityIndicator, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import * as Linking from 'expo-linking'

import { EnrollScreen } from '../screens/EnrollScreen'
import { useSession } from '../theme/SessionContext'
import { menuyuktiColors } from '../theme/tokens'
import { MainTabs } from './MainTabs'

export type RootStackParamList = {
  Enroll: { token?: string; app?: string } | undefined
  Main: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const linking = {
  prefixes: [Linking.createURL('/'), 'menuyukti://'],
  config: {
    screens: {
      Enroll: {
        path: 'enroll',
        parse: {
          token: (value: string) => value,
          app: (value: string) => value,
        },
      },
      Main: {
        path: 'main',
        screens: {
          Home: 'home',
          Rewards: 'rewards',
          Profile: 'profile',
        },
      },
    },
  },
}

function Hydrating() {
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

export function RootNavigator() {
  const { session, isHydrated } = useSession()

  if (!isHydrated) {
    return <Hydrating />
  }

  return (
    <NavigationContainer linking={linking} fallback={<Hydrating />}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {session ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Enroll" component={EnrollScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
