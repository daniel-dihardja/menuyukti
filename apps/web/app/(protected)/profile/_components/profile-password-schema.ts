import { z } from 'zod'

export function buildProfilePasswordSchema(t: (key: string) => string) {
  return z
    .object({
      currentPassword: z.string().min(1, t('passwordCurrentRequired')),
      newPassword: z.string().min(8, t('passwordMinLength')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('passwordMismatch'),
      path: ['confirmPassword'],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: t('passwordSameAsCurrent'),
      path: ['newPassword'],
    })
}
