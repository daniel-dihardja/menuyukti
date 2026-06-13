/**
 * Shared layout tokens for the signed-in app inset (`AnalyticsPageShell`) and loading skeletons.
 * Matches the print shop content column width (`app/shop/*`).
 */
export const APP_INSET_CONTENT_MAX_WIDTH_CLASS = 'max-w-[1440px]' as const

/** Default AnalyticsPageShell main padding (compact layout stays edge-aligned). */
export const ANALYTICS_PAGE_SHELL_PADDING_CLASS = 'px-4 py-4 lg:px-6 xl:px-12' as const

/** Analytics report pages: full-bleed on compact layout, standard inset padding from `lg`. */
export const ANALYTICS_REPORT_SHELL_MAIN_CLASS =
  'gap-4 px-0 py-0 lg:gap-6 lg:px-6 lg:py-4 xl:px-12' as const

/** Analytics report card wrapper: no border/radius on compact layout; card chrome from `lg`. */
export const ANALYTICS_REPORT_SECTION_CLASS =
  'rounded-none border-0 bg-transparent p-4 lg:rounded-xl lg:border lg:border-card-border lg:bg-card lg:p-6' as const
