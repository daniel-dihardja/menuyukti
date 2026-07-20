import { describe, expect, it } from 'vitest'

import {
  collectExistingDisplayCodes,
  generateMilestoneDisplayCode,
  MILESTONE_DISPLAY_CODE_REGEX,
  parseMilestoneDisplayCode,
} from '@/lib/milestones/milestone-display-code'

describe('milestone-display-code', () => {
  it('parses valid M-XXXX codes and rejects invalid shapes', () => {
    expect(parseMilestoneDisplayCode('M-A3F2')).toBe('M-A3F2')
    expect(parseMilestoneDisplayCode('m-a3f2')).toBe('M-A3F2')
    expect(parseMilestoneDisplayCode('M-OI12')).toBeUndefined()
    expect(parseMilestoneDisplayCode('A3F2')).toBeUndefined()
    expect(parseMilestoneDisplayCode('M-A3F')).toBeUndefined()
    expect(parseMilestoneDisplayCode(42)).toBeUndefined()
  })

  it('generates codes matching the regex and avoids collisions', () => {
    const existing = new Set(['M-AAAA', 'M-BBBB'])
    const generated = new Set<string>()
    for (let i = 0; i < 20; i += 1) {
      const code = generateMilestoneDisplayCode(existing)
      expect(code).toMatch(MILESTONE_DISPLAY_CODE_REGEX)
      expect(existing.has(code)).toBe(false)
      generated.add(code)
      existing.add(code)
    }
    expect(generated.size).toBe(20)
  })

  it('collects codes from data.displayCode and displayCode fields', () => {
    const codes = collectExistingDisplayCodes([
      { displayCode: 'M-A3F2' },
      { data: { displayCode: 'M-B4G3' } },
      { data: { displayCode: 'bad' } },
      { data: null },
    ])
    expect([...codes].sort()).toEqual(['M-A3F2', 'M-B4G3'])
  })
})
