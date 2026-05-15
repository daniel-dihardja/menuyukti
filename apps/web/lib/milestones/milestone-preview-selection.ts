/** Clears selection when the selected id is no longer present in the item list. */
export function syncMilestonePreviewSelectionId<TId extends string>(
  selectedId: TId | null,
  itemIds: readonly TId[],
): TId | null {
  if (selectedId === null) {
    return null
  }
  return itemIds.includes(selectedId) ? selectedId : null
}
