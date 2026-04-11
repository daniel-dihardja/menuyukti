export {}

declare global {
  interface CustomJwtSessionClaims {
    /** Set in Clerk Dashboard → Sessions → Customize session token (see `menuyukti-role.ts`). */
    menuyukti?: {
      role?: string
    }
  }
}
