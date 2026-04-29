import Link from 'next/link'

import { routes } from '@/lib/routes'

type LandingFooterProps = {
  copyright: string
  navLabel: string
  aboutLabel: string
  contactLabel: string
  faqLabel: string
  privacyPolicyLabel: string
  termsLabel: string
}

const linkClassName =
  'text-muted-foreground underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
const BUILD_YEAR = new Date().getFullYear()

export function LandingFooter({
  copyright,
  navLabel,
  aboutLabel,
  contactLabel,
  faqLabel,
  privacyPolicyLabel,
  termsLabel,
}: LandingFooterProps) {
  return (
    <footer className="mt-auto border-t border-border bg-card py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 sm:flex-row sm:justify-between">
        <nav
          aria-label={navLabel}
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-base"
        >
          <Link href="#how-it-works" className={linkClassName}>
            {aboutLabel}
          </Link>
          <Link href="#cta" className={linkClassName}>
            {contactLabel}
          </Link>
          <Link href="#faq" className={linkClassName}>
            {faqLabel}
          </Link>
          <Link href={routes.privacy} className={linkClassName}>
            {privacyPolicyLabel}
          </Link>
          <Link href={routes.terms} className={linkClassName}>
            {termsLabel}
          </Link>
        </nav>
        <p className="text-center text-base text-muted-foreground">
          © {BUILD_YEAR} {copyright}
        </p>
      </div>
    </footer>
  )
}
