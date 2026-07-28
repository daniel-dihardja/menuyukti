import { NavigationContainer } from '@react-navigation/native'

import { EnrollScreen } from '../screens/EnrollScreen'
import { useSession } from '../theme/SessionContext'
import { MainTabs } from './MainTabs'

export function RootNavigator() {
  const { session } = useSession()

  return <NavigationContainer>{session ? <MainTabs /> : <EnrollScreen />}</NavigationContainer>
}
