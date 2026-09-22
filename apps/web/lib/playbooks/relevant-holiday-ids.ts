/**
 * Build the checkbox selection set from scored holidays, excluding already-confirmed ids.
 */
export function relevantHolidayIds(
  scored: Array<{ id: string; relevant: boolean }>,
  confirmedIds: ReadonlySet<string>,
): Set<string> {
  const next = new Set<string>()
  for (const item of scored) {
    if (item.relevant && !confirmedIds.has(item.id)) {
      next.add(item.id)
    }
  }
  return next
}
