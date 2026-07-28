import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'

import { enrollDevice, parseEnrollInput } from './lib/enroll'
import { ensureDeviceKeypair } from './lib/keys'

type SuccessState = {
  customerId: string
  deviceId: string
}

export default function App() {
  const [publicKeyHex, setPublicKeyHex] = useState<string | null>(null)
  const [keysError, setKeysError] = useState<string | null>(null)
  const [enrollInput, setEnrollInput] = useState('')
  const [appIdManual, setAppIdManual] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<SuccessState | null>(null)

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
  const needsManualAppId = !parsed.isDeepLink || !parsed.appId

  const handleSubmit = async () => {
    setError(null)
    if (!publicKeyHex) {
      setError('Device keys are not ready yet')
      return
    }
    const token = parsed.token.trim()
    const appId = (parsed.appId ?? appIdManual).trim()
    if (!token) {
      setError('Paste the enrollment link or token')
      return
    }
    if (!appId) {
      setError('App UUID is required')
      return
    }
    if (!phone.trim()) {
      setError('Phone number is required (E.164, e.g. +491701234567)')
      return
    }

    setSubmitting(true)
    try {
      const result = await enrollDevice({
        token,
        appId,
        phoneE164: phone.trim(),
        publicKey: publicKeyHex,
        platform: Platform.OS,
      })
      setSuccess(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Registered</Text>
        <Text style={styles.subtitle}>You are enrolled for this restaurant app.</Text>
        <Text style={styles.meta}>Customer: {success.customerId}</Text>
        <Text style={styles.meta}>Device: {success.deviceId}</Text>
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menuyukti</Text>
      <Text style={styles.subtitle}>Customer enrollment</Text>

      {keysError ? <Text style={styles.error}>{keysError}</Text> : null}
      {!publicKeyHex && !keysError ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <Text style={styles.hint} numberOfLines={1}>
          Device key ready
        </Text>
      )}

      <Text style={styles.label}>Enrollment link or token</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={enrollInput}
        onChangeText={setEnrollInput}
        placeholder="menuyukti://enroll?token=…&app=…"
        autoCapitalize="none"
        autoCorrect={false}
        multiline
      />

      {needsManualAppId ? (
        <>
          <Text style={styles.label}>App UUID</Text>
          <TextInput
            style={styles.input}
            value={appIdManual}
            onChangeText={setAppIdManual}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </>
      ) : null}

      <Text style={styles.label}>Phone (E.164)</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+491701234567"
        keyboardType="phone-pad"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, (!publicKeyHex || submitting) && styles.buttonDisabled]}
        disabled={!publicKeyHex || submitting}
        onPress={() => void handleSubmit()}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Enroll</Text>
        )}
      </Pressable>

      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 72,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  button: {
    marginTop: 16,
    backgroundColor: '#111',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#b00020',
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: '#888',
  },
  spinner: {
    alignSelf: 'flex-start',
  },
  meta: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
})
