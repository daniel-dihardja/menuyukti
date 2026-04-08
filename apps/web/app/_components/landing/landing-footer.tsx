import Link from 'next/link'

type LandingFooterProps = {
  copyright: string
  navLabel: string
  aboutLabel: string
  contactLabel: string
  privacyLabel: string
}

export function LandingFooter({
  copyright,
  navLabel,
  aboutLabel,
  contactLabel,
  privacyLabel,
}: LandingFooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-card py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 sm:flex-row sm:justify-between">
        <nav aria-label={navLabel} className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <Link
            href="#how-it-works"
            className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {aboutLabel}
          </Link>
          <Link
            href="#cta"
            className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {contactLabel}
          </Link>
          <Link
            href="#faq"
            className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {privacyLabel}
          </Link>
        </nav>
        <p className="text-center text-sm text-muted-foreground">
          © {year} {copyright}
        </p>
      </div>
    </footer>
  )
}
