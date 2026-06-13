/** Width at which desktop layout patterns (sidebar, tables, split panes) activate. */
export const DESKTOP_LAYOUT_MIN_WIDTH = 1024

export const COMPACT_LAYOUT_MEDIA_QUERY = `(max-width: ${DESKTOP_LAYOUT_MIN_WIDTH - 1}px)` as const

export const DESKTOP_LAYOUT_MEDIA_QUERY = `(min-width: ${DESKTOP_LAYOUT_MIN_WIDTH}px)` as const
