import { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { Screen } from '../components/Screen'
import { TextField } from '../components/TextField'
import { enrollDevice, parseEnrollInput } from '../lib/enroll'
import { ensureDeviceKeypair } from '../lib/keys'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useBrand } from '../theme/BrandContext'
import { useSession, type Session } from '../theme/SessionContext'

type Props = NativeStackScreenProps<RootStackParamList, 'Enroll'>

type PendingSuccess = Session

function initialInputFromParams(params: Props['route']['params']): string {
  const token = params?.token?.trim()
  const app = params?.app?.trim()
  if (token && app) {
    return `menuyukti://enroll?token=${encodeURIComponent(token)}&app=${encodeURIComponent(app)}`
  }
  if (token) return token
  return ''
}

function paramsFingerprint(params: Props['route']['params']): string {
  return `${params?.token ?? ''}\0${params?.app ?? ''}`
}

export function EnrollScreen({ route }: Props) {
  const brand = useBrand()
  const { setSession } = useSession()
  const { colors, typography, fonts, spacing } = brand

  const [publicKeyHex, setPublicKeyHex] = useState<string | null>(null)
  const [keysError, setKeysError] = useState<string | null>(null)
  const [enrollInput, setEnrollInput] = useState(() => initialInputFromParams(route.params))
  const [paramsFp, setParamsFp] = useState(() => paramsFingerprint(route.params))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingSuccess, setPendingSuccess] = useState<PendingSuccess | null>(null)

  // Reset enroll field when deep-link params change (React "adjust state during render").
  const nextParamsFp = paramsFingerprint(route.params)
  if (nextParamsFp !== paramsFp) {
    setParamsFp(nextParamsFp)
    const fromLink = initialInputFromParams(route.params)
    if (fromLink) setEnrollInput(fromLink)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const keys = await ensureDeviceKeypair()
        if (!cancelled) setPublicKeyHex(keys.publicKeyHex)
      } catch (err) {
        if (!cancelled) {
          setKeysError(err instanceof Error ? err.message : 'Could not create device keys')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const parsed = parseEnrollInput(enrollInput)

  const handleSubmit = async () => {
    setError(null)
    if (!publicKeyHex) {
      setError('Device keys are not ready yet')
      return
    }
    const token = parsed.token.trim()
    const appId = parsed.appId?.trim() ?? ''
    if (!token || !appId) {
      setError('Paste the full enrollment link from the QR code')
      return
    }

    setSubmitting(true)
    try {
      const result = await enrollDevice({
        token,
        appId,
        publicKey: publicKeyHex,
        platform: Platform.OS,
      })
      setPendingSuccess({ ...result, appId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (pendingSuccess) {
    return (
      <Screen contentStyle={{ justifyContent: 'center', gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              ...typography.caption,
              fontFamily: fonts.sansMedium,
              color: colors.accentHover,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            {"You're in"}
          </Text>
          <Text
            style={{
              ...typography.title,
              fontFamily: fonts.sansSemiBold,
              color: colors.ink,
            }}
          >
            Welcome aboard
          </Text>
          <Text
            style={{
              ...typography.body,
              fontFamily: fonts.sans,
              color: colors.inkMuted,
            }}
          >
            You are enrolled for this restaurant app. You can add your name and phone later in
            Profile.
          </Text>
        </View>
        <Button title="Get Started" onPress={() => void setSession(pendingSuccess)} />
      </Screen>
    )
  }

  return (
    <Screen scroll keyboardAvoiding contentStyle={{ paddingTop: spacing.xl, gap: spacing.md }}>
      <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        <Text
          style={{
            ...typography.hero,
            fontFamily: fonts.sansBold,
            color: colors.ink,
          }}
        >
          {brand.name}
        </Text>
        <Text
          style={{
            ...typography.body,
            fontFamily: fonts.sans,
            color: colors.inkMuted,
          }}
        >
          Join for offers & rewards
        </Text>
      </View>

      {keysError ? (
        <Text style={{ ...typography.body, fontFamily: fonts.sans, color: colors.destructive }}>
          {keysError}
        </Text>
      ) : null}

      {!publicKeyHex && !keysError ? (
        <ActivityIndicator color={colors.accentHover} style={{ alignSelf: 'flex-start' }} />
      ) : publicKeyHex ? (
        <Text
          style={{
            ...typography.caption,
            fontFamily: fonts.sans,
            color: colors.inkFaint,
          }}
        >
          Device key ready
        </Text>
      ) : null}

      <TextField
        label="Enrollment link"
        value={enrollInput}
        onChangeText={setEnrollInput}
        placeholder="menuyukti://enroll?token=…&app=…"
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        style={{ minHeight: 72, textAlignVertical: 'top' }}
      />

      {error ? (
        <Text style={{ ...typography.body, fontFamily: fonts.sans, color: colors.destructive }}>
          {error}
        </Text>
      ) : null}

      <Button
        title="Enroll"
        loading={submitting}
        disabled={!publicKeyHex || submitting}
        onPress={() => void handleSubmit()}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  )
}
