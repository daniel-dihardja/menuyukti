import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'

import { HomeScreen } from '../screens/HomeScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { RewardsScreen } from '../screens/RewardsScreen'
import { useBrand } from '../theme/BrandContext'

export type MainTabParamList = {
  Home: undefined
  Rewards: undefined
  Profile: undefined
}

const Tab = createBottomTabNavigator<MainTabParamList>()

export function MainTabs() {
  const { colors, fonts } = useBrand()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accentHover,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.sansMedium,
          fontSize: 12,
        },
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === 'Home'
              ? ('home-outline' as const)
              : route.name === 'Rewards'
                ? ('gift-outline' as const)
                : ('person-outline' as const)
          return <Ionicons name={name} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} options={{ title: 'Cashback' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}
