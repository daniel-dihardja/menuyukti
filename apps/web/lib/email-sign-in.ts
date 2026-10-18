/**
 * Email OTP sign-in / sign-up on the login page and guest menu.
 *
 * `NEXT_PUBLIC_SHOW_EMAIL_SIGN_IN` is inlined at build time.
 * Defaults to hidden — set to `"true"` when Clerk email delivery is working again.
 */
export function isEmailSignInEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_EMAIL_SIGN_IN === 'true'
}
