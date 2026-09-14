import { z } from 'zod'

const frontpageFavoriteImageSchema = z
  .object({
    menu: z.string().min(1),
    imageFilename: z.string().min(1).max(512).nullable().optional(),
    description: z.string().max(512).nullable().optional(),
    published: z.boolean().optional().default(true),
  })
  .superRefine((value, ctx) => {
    const image = value.imageFilename?.trim() ?? ''
    const description = value.description?.trim() ?? ''
    const published = value.published ?? true
    if (!image && !description && published) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each favorite override needs an image, a description, or published=false',
      })
    }
  })

const frontpageComboImageSchema = z
  .object({
    menuA: z.string().min(1),
    menuB: z.string().min(1),
    imageFilename: z.string().min(1).max(512).nullable().optional(),
    description: z.string().max(512).nullable().optional(),
    published: z.boolean().optional().default(true),
  })
  .superRefine((value, ctx) => {
    const image = value.imageFilename?.trim() ?? ''
    const description = value.description?.trim() ?? ''
    const published = value.published ?? true
    if (!image && !description && published) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each combo override needs an image, a description, or published=false',
      })
    }
  })

export const updateLocationFrontpageSchema = z.object({
  tagline: z.string().max(512).nullable().optional(),
  showGuestFavorites: z.boolean(),
  showPopularCombos: z.boolean(),
  favoriteImages: z.array(frontpageFavoriteImageSchema).optional(),
  comboImages: z.array(frontpageComboImageSchema).optional(),
})

export type UpdateLocationFrontpageBody = z.infer<typeof updateLocationFrontpageSchema>
