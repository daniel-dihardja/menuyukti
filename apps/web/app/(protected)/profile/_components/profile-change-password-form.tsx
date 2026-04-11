'use client'

import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useState } from 'react'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardFooter, CardHeader } from '@workspace/ui/components/card'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'

import { buildProfilePasswordSchema } from './profile-password-schema'

export type ProfileChangePasswordFormUser = {
  updatePassword: (params: { currentPassword: string; newPassword: string }) => Promise<unknown>
}

export type ProfileChangePasswordFormProps = {
  user: ProfileChangePasswordFormUser
}

export function ProfileChangePasswordForm({ user }: ProfileChangePasswordFormProps) {
  const t = useTranslations('profile')
  const schema = useMemo(() => buildProfilePasswordSchema(t), [t])

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const resetForm = useCallback(() => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setFieldErrors({})
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    setSuccess(false)
    setFieldErrors({})

    const parsed = schema.safeParse({ currentPassword, newPassword, confirmPassword })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !next[key]) {
          next[key] = issue.message
        }
      }
      setFieldErrors(next)
      return
    }

    setSubmitting(true)
    try {
      await user.updatePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      })
      resetForm()
      setSuccess(true)
    } catch (err) {
      if (isClerkAPIResponseError(err) && err.errors?.[0]?.message) {
        setFormError(err.errors[0].message)
      } else if (err instanceof Error && err.message) {
        setFormError(err.message)
      } else {
        setFormError(t('passwordChangeError'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <h2 className="text-lg font-semibold tracking-tight">{t('passwordSectionTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('passwordSectionDescription')}</p>
      </CardHeader>
      <CardContent>
        <form id="profile-change-password" onSubmit={handleSubmit} className="space-y-4">
          {success ? (
            <Alert>
              <AlertDescription>{t('passwordChangeSuccess')}</AlertDescription>
            </Alert>
          ) : null}
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="profile-current-password">
                {t('passwordCurrentLabel')}
              </FieldLabel>
              <Input
                id="profile-current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(ev) => {
                  setCurrentPassword(ev.target.value)
                  setSuccess(false)
                }}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.currentPassword)}
                aria-describedby={
                  fieldErrors.currentPassword ? 'profile-current-password-error' : undefined
                }
              />
              {fieldErrors.currentPassword ? (
                <p id="profile-current-password-error" className="text-destructive text-sm">
                  {fieldErrors.currentPassword}
                </p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-new-password">{t('passwordNewLabel')}</FieldLabel>
              <Input
                id="profile-new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(ev) => {
                  setNewPassword(ev.target.value)
                  setSuccess(false)
                }}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.newPassword)}
                aria-describedby={
                  fieldErrors.newPassword ? 'profile-new-password-error' : undefined
                }
              />
              {fieldErrors.newPassword ? (
                <p id="profile-new-password-error" className="text-destructive text-sm">
                  {fieldErrors.newPassword}
                </p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-confirm-password">
                {t('passwordConfirmLabel')}
              </FieldLabel>
              <Input
                id="profile-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(ev) => {
                  setConfirmPassword(ev.target.value)
                  setSuccess(false)
                }}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={
                  fieldErrors.confirmPassword ? 'profile-confirm-password-error' : undefined
                }
              />
              {fieldErrors.confirmPassword ? (
                <p id="profile-confirm-password-error" className="text-destructive text-sm">
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <Button
          type="submit"
          form="profile-change-password"
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          {submitting ? t('passwordSubmitting') : t('passwordSubmit')}
        </Button>
      </CardFooter>
    </Card>
  )
}
