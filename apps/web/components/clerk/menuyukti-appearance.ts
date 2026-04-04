export const menuyuktiClerkAppearance = {
  variables: {
    colorPrimary: 'oklch(0.205 0 0)',
    colorText: 'oklch(0.145 0 0)',
    colorTextSecondary: 'oklch(0.556 0 0)',
    colorBackground: 'oklch(1 0 0)',
    colorInputBackground: 'oklch(1 0 0)',
    colorInput: 'oklch(0.922 0 0)',
    borderRadius: '0.65rem',
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
