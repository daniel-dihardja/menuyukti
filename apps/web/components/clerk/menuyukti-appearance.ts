export const menuyuktiClerkAppearance = {
  variables: {
    colorPrimary: 'oklch(0.58 0.17 58)',
    colorText: 'oklch(0.28 0.03 55)',
    colorTextSecondary: 'oklch(0.5 0.03 55)',
    colorBackground: 'oklch(0.99 0.012 90)',
    colorInputBackground: 'oklch(1 0.008 92)',
    colorInput: 'oklch(0.9 0.025 80)',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full',
    card: 'shadow-none border-0 bg-transparent p-0 gap-4',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsBlockButton: 'border border-border bg-background text-foreground hover:bg-muted',
    formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-none',
    formFieldInput: 'border border-input bg-background text-base py-2 rounded-[var(--radius)]',
    footerActionLink: 'text-primary font-medium',
    identityPreviewText: 'text-foreground',
    formFieldLabel: 'text-foreground font-medium',
  },
} as const
