export const menuyuktiClerkAppearance = {
  variables: {
    colorPrimary: '#2fd4c7',
    colorText: '#171717',
    colorTextSecondary: '#6b655f',
    colorBackground: '#f8f5f0',
    colorInputBackground: '#ffffff',
    colorInput: '#e7ded2',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full',
    card: 'shadow-none border-0 bg-transparent p-0 gap-4',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsBlockButton: 'border border-border bg-background text-foreground hover:bg-muted',
    formButtonPrimary:
      'bg-primary text-primary-foreground hover:bg-[var(--color-accent-hover)] shadow-none rounded-none',
    formFieldInput: 'border border-input bg-background text-base py-2 rounded-[var(--radius)]',
    footerActionLink: 'text-[var(--color-accent-hover)] font-medium',
    identityPreviewText: 'text-foreground',
    formFieldLabel: 'text-foreground font-medium',
  },
} as const
