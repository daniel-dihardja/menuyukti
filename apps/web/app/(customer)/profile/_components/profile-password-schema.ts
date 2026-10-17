import { z } from 'zod'

export function buildProfilePasswordSchema(
  t: (key: string) => string,
  options: { requireCurrentPassword: boolean },
) {
  const base = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8, t('passwordMinLength')),
    confirmPassword: z.string(),
  })

  return base.superRefine((data, ctx) => {
    if (options.requireCurrentPassword && data.currentPassword.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: t('passwordCurrentRequired'),
        path: ['currentPassword'],
      })
    }
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: t('passwordMismatch'),
        path: ['confirmPassword'],
      })
    }
    if (
      options.requireCurrentPassword &&
      data.currentPassword.length > 0 &&
      data.currentPassword === data.newPassword
    ) {
      ctx.addIssue({
        code: 'custom',
        message: t('passwordSameAsCurrent'),
        path: ['newPassword'],
      })
    }
  })
}
