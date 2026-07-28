import { useState } from 'react'
import { Platform, Text, View } from 'react-native'

import { Button } from '../components/Button'
import { Screen } from '../components/Screen'
import { SectionHeader } from '../components/SectionHeader'
import { TextField } from '../components/TextField'
import { mockRestaurant } from '../data/mockRestaurant'
import { useBrand } from '../theme/BrandContext'
import { useSession, type CustomerProfile } from '../theme/SessionContext'

const E164_RE = /^\+[1-9]\d{6,14}$/

function validateProfile(profile: CustomerProfile): string | null {
  const phone = profile.phoneE164.trim()
  if (phone && !E164_RE.test(phone.replace(/\s/g, ''))) {
    return 'Phone must be E.164 (e.g. +491701234567), or leave it blank'
  }
  return null
}

export function ProfileScreen() {
  const brand = useBrand()
  const { session, profile, saveProfile, resetSession } = useSession()
  const { colors, radius, typography, fonts, spacing } = brand

  const [draft, setDraft] = useState<CustomerProfile>(profile)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const monoFamily = Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  })

  const handleSave = () => {
    const validationError = validateProfile(draft)
    if (validationError) {
      setError(validationError)
      setSavedFlash(false)
      return
    }
    setError(null)
    saveProfile({
      givenName: draft.givenName.trim(),
      familyName: draft.familyName.trim(),
      phoneE164: draft.phoneE164.trim().replace(/\s/g, ''),
    })
    setSavedFlash(true)
  }

  return (
    <Screen scroll keyboardAvoiding contentStyle={{ paddingTop: spacing.md, gap: spacing.lg }}>
      <SectionHeader
        title="Profile"
        subtitle={`${mockRestaurant.displayName} · powered by ${brand.name}`}
      />

      <View style={{ gap: spacing.md }}>
        <SectionHeader
          title="Your details"
          subtitle="Optional — add these whenever you like. They are not required to use the app."
        />
        <TextField
          label="First name"
          value={draft.givenName}
          onChangeText={(givenName) => {
            setDraft((prev) => ({ ...prev, givenName }))
            setSavedFlash(false)
          }}
          placeholder="Alex"
          autoCapitalize="words"
          autoCorrect={false}
        />
        <TextField
          label="Surname"
          value={draft.familyName}
          onChangeText={(familyName) => {
            setDraft((prev) => ({ ...prev, familyName }))
            setSavedFlash(false)
          }}
          placeholder="Müller"
          autoCapitalize="words"
          autoCorrect={false}
        />
        <TextField
          label="Phone (E.164)"
          value={draft.phoneE164}
          onChangeText={(phoneE164) => {
            setDraft((prev) => ({ ...prev, phoneE164 }))
            setSavedFlash(false)
          }}
          placeholder="+491701234567"
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {error ? (
          <Text style={{ ...typography.body, fontFamily: fonts.sans, color: colors.destructive }}>
            {error}
          </Text>
        ) : null}
        {savedFlash ? (
          <Text style={{ ...typography.caption, fontFamily: fonts.sans, color: colors.success }}>
            Profile saved on this device
          </Text>
        ) : null}
        <Button title="Save profile" onPress={handleSave} />
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.lg,
          gap: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            ...typography.caption,
            fontFamily: fonts.sansMedium,
            color: colors.inkFaint,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          Demo mode
        </Text>
        <Text
          style={{
            ...typography.body,
            fontFamily: fonts.sans,
            color: colors.inkMuted,
          }}
        >
          Profile details stay on this device for now. Your account is identified by the customer ID
          from enrollment.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            ...typography.label,
            fontFamily: fonts.sansMedium,
            color: colors.ink,
          }}
        >
          Customer ID
        </Text>
        <Text
          style={{
            ...typography.mono,
            fontFamily: monoFamily,
            color: colors.inkMuted,
          }}
          selectable
        >
          {session?.customerId ?? '—'}
        </Text>

        <Text
          style={{
            ...typography.label,
            fontFamily: fonts.sansMedium,
            color: colors.ink,
            marginTop: spacing.sm,
          }}
        >
          Device ID
        </Text>
        <Text
          style={{
            ...typography.mono,
            fontFamily: monoFamily,
            color: colors.inkMuted,
          }}
          selectable
        >
          {session?.deviceId ?? '—'}
        </Text>
      </View>

      <Button title="Reset enrollment" variant="secondary" onPress={resetSession} />
    </Screen>
  )
}
