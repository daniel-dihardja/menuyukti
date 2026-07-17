'use client'

import { useTranslations } from 'next-intl'

export function useCloseLabel() {
  return useTranslations('common')('close')
}
