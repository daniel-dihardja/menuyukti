/**
 * Mount target for Clerk Smart CAPTCHA / bot protection.
 * Required on any surface that starts `signIn.sso` / email create before
 * Clerk can redirect (otherwise OAuth sits on “Continuing…” forever).
 *
 * Only one `#clerk-captcha` should be in the document at a time.
 */
export function ClerkCaptcha({ className }: { className?: string }) {
  return <div id="clerk-captcha" className={className} />
}
