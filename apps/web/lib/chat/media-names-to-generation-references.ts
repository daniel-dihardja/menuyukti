/** Map media-library filenames to Leonardo photo generation references. */
export function mediaNamesToPhotoGenerationReferences(
  names: string[],
): Array<{ type: 'photo'; name: string }> {
  return names.map((name) => ({ type: 'photo' as const, name }))
}
