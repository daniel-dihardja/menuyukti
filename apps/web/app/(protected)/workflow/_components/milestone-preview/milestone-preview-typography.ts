/**
 * Shared Tailwind class groups for milestone JSON previews (campaign workflow).
 * Keeps section title vs label vs body hierarchy consistent for marketer-facing scans.
 */
export const milestonePreviewTypography = {
  root: 'space-y-5 text-base',
  sectionStack: 'space-y-5',
  sectionTitle: 'text-base font-semibold tracking-tight text-foreground',
  /** Uppercase micro-labels for field names and list keys */
  fieldLabel: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  /** Inline row keys (e.g. scheduler slot rows) — not uppercase */
  rowKey: 'text-sm font-medium text-foreground',
  body: 'text-base leading-relaxed text-muted-foreground',
  bodySmall: 'text-sm leading-relaxed text-muted-foreground',
  bodyStrong: 'text-base font-medium text-foreground',
  listDisc: 'list-disc space-y-1.5 pl-5 text-base leading-relaxed text-muted-foreground',
  listDecimal: 'list-decimal space-y-2 pl-5 text-base leading-relaxed text-muted-foreground',
  /** Accordion inner padding matches previous section rhythm */
  accordionContentInner: 'pb-1 pt-0',
  /** Week / slot cards */
  insetCard: 'rounded-lg border border-border/80 bg-muted/25 p-3',
} as const
