/** Map media-library filenames to Leonardo photo generation references. */
export function mediaNamesToPhotoGenerationReferences(
  names: string[],
): Array<{ type: 'photo'; name: string }> {
  return names.map((name) => ({ type: 'photo' as const, name }))
}

/** Map post-media filenames to Leonardo previous-result generation references. */
export function postNamesToPreviousResultGenerationReferences(
  names: string[],
): Array<{ type: 'previous-result'; filename: string }> {
  return names.map((name) => ({ type: 'previous-result' as const, filename: name }))
}
