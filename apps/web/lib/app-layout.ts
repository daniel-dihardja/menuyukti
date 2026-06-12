/**
 * Shared layout tokens for the signed-in app inset (`AnalyticsPageShell`) and loading skeletons.
 * Matches the print shop content column width (`app/shop/*`).
 */
export const APP_INSET_CONTENT_MAX_WIDTH_CLASS = 'max-w-[1440px]' as const

/** Analytics report pages: full-bleed on mobile, standard inset padding from `sm`. */
export const ANALYTICS_REPORT_SHELL_MAIN_CLASS =
  'gap-4 px-0 py-0 sm:gap-6 sm:px-6 sm:py-4 md:px-12' as const

/** Analytics report card wrapper: no border/radius on mobile; card chrome from `sm`. */
export const ANALYTICS_REPORT_SECTION_CLASS =
  'rounded-none border-0 bg-transparent p-4 sm:rounded-xl sm:border sm:border-card-border sm:bg-card sm:p-6' as const
