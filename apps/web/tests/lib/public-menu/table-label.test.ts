import { describe, expect, it } from 'vitest'

import {
  PUBLIC_MENU_TABLE_LABEL_MAX_LEN,
  parsePublicMenuTableLabel,
} from '@/lib/public-menu/table-label'
import { routes } from '@/lib/routes'

describe('parsePublicMenuTableLabel', () => {
  it('trims and accepts normal labels', () => {
    expect(parsePublicMenuTableLabel('  12  ')).toBe('12')
    expect(parsePublicMenuTableLabel('Patio 2')).toBe('Patio 2')
  })

  it('decodes URI path segments', () => {
    expect(parsePublicMenuTableLabel('Patio%202')).toBe('Patio 2')
    expect(parsePublicMenuTableLabel(encodeURIComponent('Bar/1'))).toBe('Bar/1')
  })

  it('rejects empty, oversized, and control characters', () => {
    expect(parsePublicMenuTableLabel('')).toBeNull()
    expect(parsePublicMenuTableLabel('   ')).toBeNull()
    expect(parsePublicMenuTableLabel(null)).toBeNull()
    expect(parsePublicMenuTableLabel(undefined)).toBeNull()
    expect(parsePublicMenuTableLabel('a'.repeat(PUBLIC_MENU_TABLE_LABEL_MAX_LEN + 1))).toBeNull()
    expect(parsePublicMenuTableLabel('a'.repeat(PUBLIC_MENU_TABLE_LABEL_MAX_LEN))).toBe(
      'a'.repeat(PUBLIC_MENU_TABLE_LABEL_MAX_LEN),
    )
    expect(parsePublicMenuTableLabel('12\u0000')).toBeNull()
    expect(parsePublicMenuTableLabel('a\nb')).toBeNull()
  })

  it('keeps labels that contain a literal percent when decode fails', () => {
    expect(parsePublicMenuTableLabel('100%')).toBe('100%')
  })
})

describe('routes.public.locationMenuTable', () => {
  it('builds an encoded per-table menu path', () => {
    expect(routes.public.locationMenuTable('cafe', '12')).toBe('/m/cafe/t/12')
    expect(routes.public.locationMenuTable('my cafe', 'Patio 2')).toBe(
      `/m/${encodeURIComponent('my cafe')}/t/${encodeURIComponent('Patio 2')}`,
    )
  })
})
