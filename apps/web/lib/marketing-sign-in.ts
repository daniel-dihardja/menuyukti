/**
 * Marketing chrome (header Sign in + Explore/discovery).
 *
 * `NEXT_PUBLIC_SHOW_MARKETING_SIGN_IN` is inlined at build time.
 * Any value other than `"false"` keeps chrome visible (local/dev-friendly when unset).
 * Production Docker builds default the arg to `false`.
 */
function isMarketingChromeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_MARKETING_SIGN_IN !== 'false'
}

/** Header Sign in / Sign up control for signed-out visitors. */
export function isMarketingSignInEnabled(): boolean {
  return isMarketingChromeEnabled()
}

/** Explore venue directory (`/explore`) nav links and page. */
export function isExploreDiscoveryEnabled(): boolean {
  return isMarketingChromeEnabled()
}
