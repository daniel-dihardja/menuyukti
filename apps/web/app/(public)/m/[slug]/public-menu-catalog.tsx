'use client'

import { useAuth } from '@clerk/nextjs'
import { CheckCircle2, Minus, Plus, UtensilsCrossed } from 'lucide-react'
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
import {
  clearPublicMenuCart,
  loadPublicMenuCart,
  savePublicMenuCart,
} from '@/lib/public-menu/cart-storage'
import type { PublicMenuCategoryView, PublicMenuItemView } from '@/lib/public-menu/load-public-menu'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@workspace/ui/components/drawer'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Spinner } from '@workspace/ui/components/spinner'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
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

function categorySectionId(category: PublicMenuCategoryView): string {
  return `cat-${category.sortOrder}-${encodeURIComponent(category.name)}`
}

function FilterChipRow({
  label,
  options,
  selected,
  onChange,
  labelFor,
}: {
  label: string
  options: readonly string[]
  selected: ReadonlySet<string>
  onChange: (next: string[]) => void
  labelFor: (value: string) => string
}) {
  if (options.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <ToggleGroup
        type="multiple"
        value={[...selected]}
        onValueChange={onChange}
        className="flex flex-wrap justify-start gap-2"
        aria-label={label}
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            className="h-11 min-h-11 touch-manipulation rounded-full px-3 text-xs font-medium sm:h-9 sm:min-h-9"
          >
            {labelFor(option)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

function QtyStepper({
  qty,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  removeLabel,
}: {
  qty: number
  onDecrease: () => void
  onIncrease: () => void
  decreaseLabel: string
  increaseLabel: string
  removeLabel: string
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-10 touch-manipulation sm:size-9"
        aria-label={qty <= 1 ? removeLabel : decreaseLabel}
        onClick={onDecrease}
      >
        <Minus />
      </Button>
      <span className="min-w-6 text-center text-sm tabular-nums">{qty}</span>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-10 touch-manipulation sm:size-9"
        aria-label={increaseLabel}
        onClick={onIncrease}
      >
        <Plus />
      </Button>
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
  const [cartHydrated, setCartHydrated] = useState(false)
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
  const showCategoryJump = filteredCategories.length > 2
  const showStickyChrome = showFilters || showCategoryJump

  const cartLines = useMemo(() => Object.values(cart), [cart])
  const cartItemCount = cartLines.reduce((sum, line) => sum + line.qty, 0)
  const cartTotal = cartLines.reduce((sum, line) => sum + line.price * line.qty, 0)
  const hasCart = cartItemCount > 0

  useEffect(() => {
    setCart(loadPublicMenuCart(locationId))
    setCartHydrated(true)
  }, [locationId])

  useEffect(() => {
    if (!cartHydrated) return
    savePublicMenuCart(locationId, cart)
  }, [cart, cartHydrated, locationId])

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
    savePublicMenuCart(locationId, cart)
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
      clearPublicMenuCart(locationId)
      setBasketOpen(false)
      setSuccessBillNumber(body.billNumber)
    } catch {
      setSubmitError(t('order.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const scrollToCategory = (category: PublicMenuCategoryView) => {
    const el = document.getElementById(categorySectionId(category))
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-8',
        hasCart ? 'pb-[calc(7rem+env(safe-area-inset-bottom))]' : undefined,
      )}
    >
      {successBillNumber ? (
        <Alert role="status">
          <CheckCircle2 />
          <AlertTitle>{t('order.successTitle')}</AlertTitle>
          <AlertDescription>
            {t('order.successBody', { billNumber: successBillNumber })}
          </AlertDescription>
        </Alert>
      ) : null}

      {showStickyChrome ? (
        <div className="bg-card/90 sticky top-14 z-20 -mx-6 flex flex-col gap-4 border-b px-6 py-4 backdrop-blur-sm sm:-mx-10 sm:px-10">
          {showFilters ? (
            <>
              <FilterChipRow
                label={t('filters.dietary')}
                options={present.dietaryTags}
                selected={dietaryInclude}
                onChange={(next) => setDietaryInclude(new Set(next))}
                labelFor={(value) => t(`dietary.${value as MenuDietaryTag}`)}
              />
              <FilterChipRow
                label={t('filters.allergens')}
                options={present.allergens}
                selected={allergenExclude}
                onChange={(next) => setAllergenExclude(new Set(next))}
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
                    className="min-h-11 touch-manipulation sm:min-h-8"
                    onClick={() => {
                      setDietaryInclude(new Set())
                      setAllergenExclude(new Set())
                    }}
                  >
                    {t('filters.clear')}
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}

          {showCategoryJump ? (
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <nav aria-label={t('categoriesNavAria')} className="flex w-max flex-nowrap gap-2">
                {filteredCategories.map((category) => (
                  <Button
                    key={categorySectionId(category)}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-11 min-h-11 shrink-0 touch-manipulation snap-start rounded-full px-4 text-xs font-medium sm:h-9 sm:min-h-9"
                    onClick={() => scrollToCategory(category)}
                  >
                    {category.name}
                  </Button>
                ))}
              </nav>
            </div>
          ) : null}
        </div>
      ) : null}

      {filtersActive && matchCount === 0 ? (
        <Empty className="border border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UtensilsCrossed />
            </EmptyMedia>
            <EmptyTitle>{t('filters.noMatchesTitle')}</EmptyTitle>
            <EmptyDescription>{t('filters.noMatches')}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 touch-manipulation"
              onClick={() => {
                setDietaryInclude(new Set())
                setAllergenExclude(new Set())
              }}
            >
              {t('filters.clear')}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-12">
          {filteredCategories.map((category) => (
            <section
              key={category.name}
              id={categorySectionId(category)}
              aria-labelledby={`${categorySectionId(category)}-heading`}
              className="scroll-mt-[calc(3.5rem+5.5rem)]"
            >
              <h2
                id={`${categorySectionId(category)}-heading`}
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
                                className="rounded-full px-2 py-0 text-[11px] font-medium"
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
                        <div className="mt-3 flex items-center justify-end gap-2">
                          {inCart > 0 ? (
                            <QtyStepper
                              qty={inCart}
                              onDecrease={() => decrementItem(item.id)}
                              onIncrease={() => addItem(item)}
                              decreaseLabel={t('order.decreaseQty', { name: item.name })}
                              increaseLabel={t('order.increaseQty', { name: item.name })}
                              removeLabel={t('order.removeItem', { name: item.name })}
                            />
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="min-h-11 touch-manipulation px-4 sm:min-h-8"
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
        <div className="border-border bg-card/95 fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {t('order.cartSummary', { count: cartItemCount })}
              </p>
              <p className="text-muted-foreground text-sm tabular-nums">
                {formatCurrency(cartTotal, currencyCode, locale)}
              </p>
            </div>
            <Button
              type="button"
              className="min-h-11 touch-manipulation sm:min-h-9"
              onClick={() => setBasketOpen(true)}
            >
              {t('order.viewBasket')}
            </Button>
          </div>
        </div>
      ) : null}

      <Drawer open={basketOpen} onOpenChange={setBasketOpen}>
        <DrawerContent className="flex max-h-[min(90dvh,40rem)] flex-col gap-0 overflow-hidden">
          <DrawerHeader className="shrink-0 border-b text-left">
            <DrawerTitle>{t('order.basketTitle')}</DrawerTitle>
            <DrawerDescription>{t('order.basketDescription')}</DrawerDescription>
            {hasCart ? (
              <p className="text-muted-foreground text-sm">
                {t('order.cartSummary', { count: cartItemCount })} ·{' '}
                <span className="text-foreground font-medium tabular-nums">
                  {formatCurrency(cartTotal, currencyCode, locale)}
                </span>
              </p>
            ) : null}
          </DrawerHeader>

          <ScrollArea className="min-h-0 flex-1 overflow-hidden">
            <div className="px-4 py-3">
              {cartLines.length === 0 ? (
                <Empty className="border-0 py-8">
                  <EmptyHeader>
                    <EmptyTitle>{t('order.emptyBasketTitle')}</EmptyTitle>
                    <EmptyDescription>{t('order.emptyBasket')}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
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
                        <QtyStepper
                          qty={line.qty}
                          onDecrease={() => decrementItem(line.menuItemId)}
                          onIncrease={() => increaseCartLine(line.menuItemId)}
                          decreaseLabel={t('order.decreaseQty', { name: line.name })}
                          increaseLabel={t('order.increaseQty', { name: line.name })}
                          removeLabel={t('order.removeItem', { name: line.name })}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </ScrollArea>

          <DrawerFooter className="shrink-0 border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
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
                <Alert variant="destructive">
                  <AlertTitle>{t('order.submitFailedTitle')}</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}
              <Button
                type="button"
                className="min-h-11 w-full touch-manipulation"
                disabled={submitting || !isLoaded || !hasCart}
                onClick={() => void submitOrder()}
              >
                {!isLoaded || submitting ? <Spinner /> : null}
                {!isLoaded
                  ? t('order.sending')
                  : !isSignedIn
                    ? t('order.signInToOrder')
                    : submitting
                      ? t('order.sending')
                      : t('order.send')}
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
