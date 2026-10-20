/**
 * Marketing chrome (header Sign in for signed-out visitors).
 *
 * `NEXT_PUBLIC_SHOW_MARKETING_SIGN_IN` is inlined at build time.
 * Any value other than `"false"` keeps chrome visible (local/dev-friendly when unset).
 * Production Docker builds default the arg to `false`.
 *
 * Explore (`/explore`) is auth-gated via Clerk — not controlled by this flag.
 */
export function isMarketingSignInEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_MARKETING_SIGN_IN !== 'false'
}
