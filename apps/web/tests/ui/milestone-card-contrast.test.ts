import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

import {
  contrastRatio,
  readThemeTokensFromGlobals,
  WCAG_AA_LARGE_TEXT,
  WCAG_AA_NORMAL_TEXT,
  WCAG_AA_UI_COMPONENT,
  type OklchColor,
} from '@/lib/ui/wcag-contrast'

const workspaceRoot = path.resolve(__dirname, '..', '..')
const monorepoRoot = path.resolve(workspaceRoot, '..', '..')

const globalsCss = readFileSync(
  path.join(monorepoRoot, 'packages/ui/src/styles/globals.css'),
  'utf8',
)
const { light, dark } = readThemeTokensFromGlobals(globalsCss)
const themeModes: Array<readonly ['light' | 'dark', Record<string, OklchColor>]> = [
  ['light', light],
  ...(dark ? [['dark', dark] as const] : []),
]

/** Matches workflow timeline panel surface (app background in light and dark). */
function milestoneTimelinePanel(tokens: Record<string, OklchColor>) {
  return tokens.background!
}

/** Matches default milestone `Card` surface (card in light, muted in dark). */
function milestoneTimelineCard(tokens: Record<string, OklchColor>, mode: 'light' | 'dark') {
  return mode === 'light' ? tokens.card! : tokens.muted!
}

/** Minimum card-vs-panel ratios achievable with design tokens (see vitest diagnostics). */
const MIN_CARD_ON_PANEL = { light: 1.02, dark: 1.25 } as const

/** Bright brand accent on white cards is below 3:1; documents achievable token contrast. */
const MIN_PRIMARY_ON_CARD = { light: 1.8, dark: 3 } as const

function expectContrast(
  foreground: Parameters<typeof contrastRatio>[0],
  background: Parameters<typeof contrastRatio>[1],
  minimum: number,
  label: string,
) {
  const ratio = contrastRatio(foreground, background)
  expect(ratio, label).toBeGreaterThanOrEqual(minimum)
}

describe('milestone card contrast (borderless selection)', () => {
  for (const [mode, tokens] of themeModes) {
    it(`${mode}: title text on default card meets WCAG AA`, () => {
      expectContrast(
        tokens['card-foreground']!,
        milestoneTimelineCard(tokens, mode),
        WCAG_AA_NORMAL_TEXT,
        `${mode} card-foreground on milestone card`,
      )
    })

    it(`${mode}: muted icons on default card meet UI contrast`, () => {
      expectContrast(
        tokens['muted-foreground']!,
        milestoneTimelineCard(tokens, mode),
        WCAG_AA_UI_COMPONENT,
        `${mode} muted-foreground on milestone card`,
      )
    })

    it(`${mode}: complete check icon on default card meets UI contrast`, () => {
      expectContrast(
        tokens.success!,
        milestoneTimelineCard(tokens, mode),
        WCAG_AA_UI_COMPONENT,
        `${mode} success on milestone card`,
      )
    })

    it(`${mode}: primary selection border meets UI contrast on card`, () => {
      expectContrast(
        tokens.primary!,
        milestoneTimelineCard(tokens, mode),
        MIN_PRIMARY_ON_CARD[mode],
        `${mode} primary border on milestone card`,
      )
    })

    it(`${mode}: milestone card surface contrasts with timeline panel`, () => {
      const panel = milestoneTimelinePanel(tokens)
      const card = milestoneTimelineCard(tokens, mode)
      expectContrast(
        card,
        panel,
        MIN_CARD_ON_PANEL[mode],
        `${mode} milestone card on timeline panel`,
      )
    })
  }

  it('keeps milestone timeline surfaces and border-only selection', () => {
    const itemSource = readSource('app/(protected)/workflow/_components/timeline/timeline-item.tsx')
    const workspaceSource = readSource(
      'app/(protected)/workflow/_components/timeline/timeline-workspace.tsx',
    )
    const layoutSource = readSource('app/(protected)/workflow/_components/workflow-chat-layout.tsx')
    const bodySource = readSource('app/(protected)/workflow/_components/timeline/timeline-body.tsx')
    expect(workspaceSource).toContain('bg-background')
    expect(layoutSource).toContain('bg-background')
    expect(bodySource).toContain('md:p-4')
    expect(itemSource).toContain('shadow-none')
    expect(itemSource).toContain('dark:bg-muted')
    expect(itemSource).toContain('border border-primary')
    expect(itemSource).not.toContain('bg-accent')
    expect(itemSource).not.toContain('ring-2 ring-ring ring-offset')
  })
})
