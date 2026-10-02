export type PublicMenuStoredCartLine = {
  menuItemId: number
  name: string
  price: number
  qty: number
}

function storageKey(locationId: number): string {
  return `public-menu-cart:${locationId}`
}

export function loadPublicMenuCart(locationId: number): Record<number, PublicMenuStoredCartLine> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(storageKey(locationId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const next: Record<number, PublicMenuStoredCartLine> = {}
    for (const [key, value] of Object.entries(parsed)) {
      const menuItemId = Number(key)
      if (!Number.isFinite(menuItemId) || !value || typeof value !== 'object') continue
      const line = value as Partial<PublicMenuStoredCartLine>
      if (
        typeof line.menuItemId !== 'number' ||
        typeof line.name !== 'string' ||
        typeof line.price !== 'number' ||
        typeof line.qty !== 'number' ||
        line.qty < 1
      ) {
        continue
      }
      next[menuItemId] = {
        menuItemId: line.menuItemId,
        name: line.name,
        price: line.price,
        qty: line.qty,
      }
    }
    return next
  } catch {
    return {}
  }
}

export function savePublicMenuCart(
  locationId: number,
  cart: Record<number, PublicMenuStoredCartLine>,
): void {
  if (typeof window === 'undefined') return
  try {
    if (Object.keys(cart).length === 0) {
      sessionStorage.removeItem(storageKey(locationId))
      return
    }
    sessionStorage.setItem(storageKey(locationId), JSON.stringify(cart))
  } catch {
    // Quota / private mode — ignore; cart stays in memory.
  }
}

export function clearPublicMenuCart(locationId: number): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(storageKey(locationId))
  } catch {
    // ignore
  }
}
