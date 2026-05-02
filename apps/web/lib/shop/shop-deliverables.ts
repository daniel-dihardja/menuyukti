/** S3 prefix for shop deliverables (preview + download). Keys: `{prefix}/{slug}/{filename}`. */
export const SHOP_DELIVERABLE_PREFIX = 'shop-deliverables'

export function shopDeliverableObjectKey(slug: string, filename: string): string {
  return `${SHOP_DELIVERABLE_PREFIX}/${slug}/${filename}`
}
