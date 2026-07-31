'use client'

import { useId } from 'react'

export type FieldIds = {
  /** Control id for `htmlFor` / `id` */
  id: string
  /** Id for the inline error element */
  errorId: string
  /** Id for an optional hint / description */
  descriptionId: string
  /**
   * Value for `aria-describedby` when the field is invalid.
   * Pass extra description ids (e.g. hint) to keep them associated.
   */
  describedBy: (invalid: boolean, ...extraIds: Array<string | undefined>) => string | undefined
}

/** Stable control / error / description ids for associating FieldError with inputs. */
export function useFieldIds(): FieldIds {
  const id = useId()
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`

  return {
    id,
    errorId,
    descriptionId,
    describedBy(invalid, ...extraIds) {
      const parts = [...extraIds.filter((value): value is string => Boolean(value))]
      if (invalid) parts.push(errorId)
      return parts.length > 0 ? parts.join(' ') : undefined
    },
  }
}
