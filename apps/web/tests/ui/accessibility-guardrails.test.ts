import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const workspaceRoot = path.resolve(__dirname, '..', '..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

describe('UI accessibility guardrails', () => {
  it('keeps an accessible label on analytics table row actions', () => {
    const source = readSource('app/(protected)/analytics/sales/sales-table.tsx')
    expect(source).toContain("aria-label={t('action')}")
  })

  it('uses semantic button for asset preview trigger', () => {
    const source = readSource('app/(protected)/assets/_components/assets-image-grid.tsx')
    expect(source).toContain('type="button"')
    expect(source).not.toContain('role="button"')
  })
})
