import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const workspaceRoot = path.resolve(__dirname, '..', '..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

describe('UI accessibility guardrails', () => {
  it('keeps an accessible label on analytics table row actions', () => {
    const salesTable = readSource('app/(protected)/analytics/sales/sales-table.tsx')
    const actionMenu = readSource(
      'app/(protected)/analytics/_components/responsive-action-menu.tsx',
    )

    expect(salesTable).toContain("desktopTriggerAriaLabel: t('action')")
    expect(actionMenu).toContain('aria-label={desktopTriggerAriaLabel}')
  })

  it('uses semantic button for media upload browse control', () => {
    const source = readSource('app/(protected)/media/_components/media-upload-zone.tsx')
    expect(source).toContain('type="button"')
    expect(source).not.toContain('role="button"')
  })

  it('uses semantic buttons instead of role=button for content media tiles', () => {
    const source = readSource('app/(protected)/content/_components/content-media-grid.tsx')
    expect(source).not.toContain('role="button"')
    expect(source).toContain('type="button"')
  })

  it('uses semantic buttons instead of role=button for matrix distribution cards', () => {
    const source = readSource(
      'app/(protected)/analytics/[analyticsId]/matrix/matrix-distribution-grid.tsx',
    )
    expect(source).not.toContain('role="button"')
    expect(source).toContain('type="button"')
  })

  it('navigates styles library cards with Link', () => {
    const source = readSource('app/(protected)/ig-studio/styles/_components/styles-library.tsx')
    expect(source).toContain("from 'next/link'")
    expect(source).toContain('href={detailHref}')
    expect(source).not.toContain('router.push(routes.igStudioStyleDetail')
  })
})
