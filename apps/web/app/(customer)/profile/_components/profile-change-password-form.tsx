'use client'

import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { useTranslations } from 'next-intl'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'

import { useFieldIds } from '@/hooks/use-field-ids'

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

  const currentField = useFieldIds()
  const newField = useFieldIds()
  const confirmField = useFieldIds()
  const currentRef = useRef<HTMLInputElement>(null)
  const newRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [focusErrorNonce, setFocusErrorNonce] = useState(0)

  const resetForm = useCallback(() => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setFieldErrors({})
  }, [])

  useLayoutEffect(() => {
    if (focusErrorNonce === 0) return
    if (fieldErrors.currentPassword) {
      currentRef.current?.focus()
      return
    }
    if (fieldErrors.newPassword) {
      newRef.current?.focus()
      return
    }
    if (fieldErrors.confirmPassword) {
      confirmRef.current?.focus()
    }
  }, [focusErrorNonce, fieldErrors])

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
      setFocusErrorNonce((n) => n + 1)
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
    <section className="max-w-md space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">{t('passwordSectionTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('passwordSectionDescription')}</p>
      </div>
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
          <Field data-invalid={fieldErrors.currentPassword ? true : undefined}>
            <FieldLabel htmlFor={currentField.id}>{t('passwordCurrentLabel')}</FieldLabel>
            <Input
              ref={currentRef}
              id={currentField.id}
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
              aria-describedby={currentField.describedBy(Boolean(fieldErrors.currentPassword))}
            />
            {fieldErrors.currentPassword ? (
              <FieldError id={currentField.errorId}>{fieldErrors.currentPassword}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={fieldErrors.newPassword ? true : undefined}>
            <FieldLabel htmlFor={newField.id}>{t('passwordNewLabel')}</FieldLabel>
            <Input
              ref={newRef}
              id={newField.id}
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
              aria-describedby={newField.describedBy(Boolean(fieldErrors.newPassword))}
            />
            {fieldErrors.newPassword ? (
              <FieldError id={newField.errorId}>{fieldErrors.newPassword}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={fieldErrors.confirmPassword ? true : undefined}>
            <FieldLabel htmlFor={confirmField.id}>{t('passwordConfirmLabel')}</FieldLabel>
            <Input
              ref={confirmRef}
              id={confirmField.id}
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
              aria-describedby={confirmField.describedBy(Boolean(fieldErrors.confirmPassword))}
            />
            {fieldErrors.confirmPassword ? (
              <FieldError id={confirmField.errorId}>{fieldErrors.confirmPassword}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? t('passwordSubmitting') : t('passwordSubmit')}
        </Button>
      </form>
    </section>
  )
}
