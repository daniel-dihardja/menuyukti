'use client'

import { useAuth } from '@clerk/nextjs'
import { Minus, Plus } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { buildLoginUrl, rememberAuthReturnPath } from '@/lib/auth-return-path'
import { formatCurrency, getCurrencyLocale } from '@/lib/currency'
import {
  collectPresentMenuAttributes,
  itemMatchesMenuAttributeFilters,
  type MenuAllergen,
  type MenuDietaryTag,
} from '@/lib/menu/menu-attributes'
import type { PublicMenuCategoryView, PublicMenuItemView } from '@/lib/public-menu/load-public-menu'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { cn } from '@workspace/ui/lib/utils'

type Props = {
  locationId: number
  publicSlug: string
  categories: PublicMenuCategoryView[]
  currencyCode: string
  /** Locked table from `/m/{slug}/t/{label}`; null on the shared menu URL. */
  tableLabel: string | null
}

type CartLine = {
  menuItemId: number
  name: string
  price: number
  qty: number
}

function toggleSetValue(prev: Set<string>, value: string): Set<string> {
  const next = new Set(prev)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function FilterChipRow({
  label,
  options,
  selected,
  onToggle,
  labelFor,
}: {
  label: string
  options: readonly string[]
  selected: ReadonlySet<string>
  onToggle: (value: string) => void
  labelFor: (value: string) => string
}) {
  if (options.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => {
          const active = selected.has(option)
          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className="h-8 rounded-full px-3 text-xs font-medium"
            >
              {labelFor(option)}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export function PublicMenuCatalog({
  locationId,
  publicSlug,
  categories,
  currencyCode,
  tableLabel,
}: Props) {
  const t = useTranslations('public.menu')
  const pathname = usePathname()
  const { isSignedIn, isLoaded } = useAuth()
  const locale = getCurrencyLocale(currencyCode)
  const [dietaryInclude, setDietaryInclude] = useState<Set<string>>(() => new Set())
  const [allergenExclude, setAllergenExclude] = useState<Set<string>>(() => new Set())
  const [cart, setCart] = useState<Record<number, CartLine>>({})
  const [basketOpen, setBasketOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successBillNumber, setSuccessBillNumber] = useState<string | null>(null)

  const allItems = useMemo(() => categories.flatMap((category) => category.items), [categories])
  const itemsById = useMemo(() => new Map(allItems.map((item) => [item.id, item])), [allItems])
  const present = useMemo(() => collectPresentMenuAttributes(allItems), [allItems])

  const filteredCategories = useMemo(() => {
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          itemMatchesMenuAttributeFilters(item, dietaryInclude, allergenExclude),
        ),
      }))
      .filter((category) => category.items.length > 0)
  }, [allergenExclude, categories, dietaryInclude])

  const matchCount = filteredCategories.reduce((sum, category) => sum + category.items.length, 0)
  const filtersActive = dietaryInclude.size > 0 || allergenExclude.size > 0
  const showFilters = present.dietaryTags.length > 0 || present.allergens.length > 0

  const cartLines = useMemo(() => Object.values(cart), [cart])
  const cartItemCount = cartLines.reduce((sum, line) => sum + line.qty, 0)
  const cartTotal = cartLines.reduce((sum, line) => sum + line.price * line.qty, 0)
  const hasCart = cartItemCount > 0

  useEffect(() => {
    if (!hasCart && basketOpen) {
      setBasketOpen(false)
    }
  }, [basketOpen, hasCart])

  const addItem = (item: PublicMenuItemView) => {
    setSuccessBillNumber(null)
    setSubmitError(null)
    setCart((prev) => {
      const existing = prev[item.id]
      const qty = (existing?.qty ?? 0) + 1
      return {
        ...prev,
        [item.id]: {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          qty,
        },
      }
    })
  }

  const increaseCartLine = (menuItemId: number) => {
    const item = itemsById.get(menuItemId)
    if (item) addItem(item)
  }

  const decrementItem = (menuItemId: number) => {
    setSubmitError(null)
    setCart((prev) => {
      const existing = prev[menuItemId]
      if (!existing) return prev
      if (existing.qty <= 1) {
        const next = { ...prev }
        delete next[menuItemId]
        return next
      }
      return {
        ...prev,
        [menuItemId]: { ...existing, qty: existing.qty - 1 },
      }
    })
  }

  const redirectToSignIn = () => {
    const returnPath = pathname || `/m/${encodeURIComponent(publicSlug)}`
    rememberAuthReturnPath(returnPath)
    window.location.assign(buildLoginUrl(returnPath))
  }

  const submitOrder = async () => {
    if (!hasCart || submitting) return
    setSubmitError(null)

    if (!isLoaded) return
    if (!isSignedIn) {
      redirectToSignIn()
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/public-menu/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          lines: cartLines.map((line) => ({
            menuItemId: line.menuItemId,
            qty: line.qty,
          })),
          tableLabel,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        billNumber?: string
        message?: string
        error?: string
      }
      if (res.status === 401) {
        redirectToSignIn()
        return
      }
      if (!res.ok) {
        setSubmitError(body.message || body.error || t('order.submitFailed'))
        return
      }
      if (!body.billNumber) {
        setSubmitError(t('order.submitFailed'))
        return
      }
      setCart({})
      setBasketOpen(false)
      setSuccessBillNumber(body.billNumber)
    } catch {
      setSubmitError(t('order.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-8', hasCart || successBillNumber ? 'pb-28' : undefined)}>
      {successBillNumber ? (
        <div role="status" className="bg-card border-border rounded-xl border px-4 py-3 text-sm">
          <p className="font-medium">{t('order.successTitle')}</p>
          <p className="text-muted-foreground mt-1">
            {t('order.successBody', { billNumber: successBillNumber })}
          </p>
        </div>
      ) : null}

      {showFilters ? (
        <div className="bg-card/90 sticky top-0 z-20 -mx-6 space-y-4 border-b px-6 py-4 backdrop-blur-sm sm:-mx-10 sm:px-10">
          <FilterChipRow
            label={t('filters.dietary')}
            options={present.dietaryTags}
            selected={dietaryInclude}
            onToggle={(value) => setDietaryInclude((prev) => toggleSetValue(prev, value))}
            labelFor={(value) => t(`dietary.${value as MenuDietaryTag}`)}
          />
          <FilterChipRow
            label={t('filters.allergens')}
            options={present.allergens}
            selected={allergenExclude}
            onToggle={(value) => setAllergenExclude((prev) => toggleSetValue(prev, value))}
            labelFor={(value) => t(`allergens.${value as MenuAllergen}`)}
          />
          {filtersActive ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-muted-foreground text-sm">
                {matchCount === 0
                  ? t('filters.noMatches')
                  : t('filters.matchCount', { count: matchCount })}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDietaryInclude(new Set())
                  setAllergenExclude(new Set())
                }}
              >
                {t('filters.clear')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {filtersActive && matchCount === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t('filters.noMatches')}</p>
      ) : (
        <div className="flex flex-col gap-12">
          {filteredCategories.map((category) => (
            <section
              key={category.name}
              aria-labelledby={`cat-${category.sortOrder}-${category.name}`}
            >
              <h2
                id={`cat-${category.sortOrder}-${category.name}`}
                className="mb-4 text-sm font-semibold tracking-wide uppercase"
              >
                {category.name}
              </h2>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {category.items.map((item) => {
                  const description = item.description.trim()
                  const inCart = cart[item.id]?.qty ?? 0
                  return (
                    <li
                      key={item.id}
                      className="bg-card text-card-foreground overflow-hidden rounded-xl border"
                    >
                      {item.imageUrl ? (
                        <div className="bg-muted aspect-[4/3] overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="size-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-1.5 p-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="text-base font-medium tracking-tight">{item.name}</h3>
                          <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                            {formatCurrency(item.price, currencyCode, locale)}
                          </span>
                        </div>
                        {description ? (
                          <p className="text-muted-foreground line-clamp-3 text-sm text-pretty">
                            {description}
                          </p>
                        ) : null}
                        {item.dietaryTags.length > 0 || item.allergens.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {item.dietaryTags.map((tag) => (
                              <Badge
                                key={`diet-${tag}`}
                                variant="secondary"
                                className={cn('rounded-full px-2 py-0 text-[11px] font-medium')}
                              >
                                {t(`dietary.${tag as MenuDietaryTag}`)}
                              </Badge>
                            ))}
                            {item.allergens.map((allergen) => (
                              <Badge
                                key={`all-${allergen}`}
                                variant="outline"
                                className="rounded-full px-2 py-0 text-[11px] font-medium"
                              >
                                {t(`allergens.${allergen as MenuAllergen}`)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          {inCart > 0 ? (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="size-8"
                                aria-label={t('order.decreaseQty', { name: item.name })}
                                onClick={() => decrementItem(item.id)}
                              >
                                <Minus className="size-3.5" />
                              </Button>
                              <span className="min-w-6 text-center text-sm tabular-nums">
                                {inCart}
                              </span>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="size-8"
                                aria-label={t('order.increaseQty', { name: item.name })}
                                onClick={() => addItem(item)}
                              >
                                <Plus className="size-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addItem(item)}
                            >
                              {t('order.add')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {hasCart ? (
        <div className="border-border bg-card/95 fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {t('order.cartSummary', { count: cartItemCount })}
              </p>
              <p className="text-muted-foreground text-sm tabular-nums">
                {formatCurrency(cartTotal, currencyCode, locale)}
              </p>
            </div>
            <Button type="button" onClick={() => setBasketOpen(true)}>
              {t('order.viewBasket')}
            </Button>
          </div>
        </div>
      ) : null}

      <Sheet open={basketOpen} onOpenChange={setBasketOpen}>
        <SheetContent
          side="bottom"
          closeLabel={t('order.closeBasket')}
          className="flex max-h-[min(90dvh,40rem)] flex-col gap-0 rounded-t-2xl p-0"
        >
          <SheetHeader className="shrink-0 border-b pr-12 text-left">
            <SheetTitle>{t('order.basketTitle')}</SheetTitle>
            <SheetDescription>{t('order.basketDescription')}</SheetDescription>
            {hasCart ? (
              <p className="text-muted-foreground text-sm">
                {t('order.cartSummary', { count: cartItemCount })} ·{' '}
                <span className="text-foreground font-medium tabular-nums">
                  {formatCurrency(cartTotal, currencyCode, locale)}
                </span>
              </p>
            ) : null}
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {cartLines.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                {t('order.emptyBasket')}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {cartLines.map((line) => {
                  const lineTotal = line.price * line.qty
                  return (
                    <li
                      key={line.menuItemId}
                      className="border-border flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{line.name}</p>
                        <p className="text-muted-foreground text-xs tabular-nums">
                          {formatCurrency(line.price, currencyCode, locale)} × {line.qty}
                        </p>
                        <p className="mt-1 text-sm font-medium tabular-nums">
                          {formatCurrency(lineTotal, currencyCode, locale)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-8"
                          aria-label={
                            line.qty <= 1
                              ? t('order.removeItem', { name: line.name })
                              : t('order.decreaseQty', { name: line.name })
                          }
                          onClick={() => decrementItem(line.menuItemId)}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="min-w-6 text-center text-sm tabular-nums">{line.qty}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-8"
                          aria-label={t('order.increaseQty', { name: line.name })}
                          onClick={() => increaseCartLine(line.menuItemId)}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <SheetFooter className="shrink-0 border-t">
            <div className="flex w-full flex-col gap-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">{t('order.basketTotal')}</p>
                  <p className="text-base font-semibold tabular-nums">
                    {formatCurrency(cartTotal, currencyCode, locale)}
                  </p>
                </div>
                {tableLabel ? (
                  <p className="text-muted-foreground text-sm font-medium">
                    {t('order.tableLabelReadOnly', { label: tableLabel })}
                  </p>
                ) : null}
              </div>
              {submitError ? (
                <p role="alert" className="text-destructive text-sm">
                  {submitError}
                </p>
              ) : null}
              <Button
                type="button"
                className="w-full"
                disabled={submitting || !isLoaded || !hasCart}
                onClick={() => void submitOrder()}
              >
                {!isLoaded
                  ? t('order.sending')
                  : !isSignedIn
                    ? t('order.signInToOrder')
                    : submitting
                      ? t('order.sending')
                      : t('order.send')}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
