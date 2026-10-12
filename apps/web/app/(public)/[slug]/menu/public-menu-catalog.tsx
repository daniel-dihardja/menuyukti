'use client'

import { useAuth } from '@clerk/nextjs'
import {
  ChevronRight,
  Minus,
  Plus,
  Receipt,
  ThumbsDown,
  ThumbsUp,
  UtensilsCrossed,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { buildLoginUrl, rememberAuthReturnPath } from '@/lib/auth-return-path'
import { formatCurrency, getCurrencyLocale } from '@/lib/currency'
import { POINT_EARN_ACTION_OPEN_MENU_QR } from '@/lib/graphql/queries/point-ledger'
import {
  collectPresentMenuAttributes,
  itemMatchesMenuAttributeFilters,
  type MenuAllergen,
  type MenuDietaryTag,
} from '@/lib/menu/menu-attributes'
import {
  clearPublicMenuActiveOrder,
  isTerminalTicketStatus,
  loadPublicMenuActiveOrder,
  normalizeFulfillmentMode,
  normalizePrepStatus,
  normalizeTicketStatus,
  savePublicMenuActiveOrder,
  type PublicMenuActiveOrder,
  type PublicMenuPrepStatus,
} from '@/lib/public-menu/active-order-storage'
import {
  clearPublicMenuCart,
  loadPublicMenuCart,
  savePublicMenuCart,
} from '@/lib/public-menu/cart-storage'
import {
  resolveGuestFulfillment,
  type PublicMenuFulfillmentMode,
} from '@/lib/public-menu/fulfillment-mode'
import type { PublicMenuCategoryView, PublicMenuItemView } from '@/lib/public-menu/load-public-menu'
import { PUBLIC_MENU_TABLE_LABEL_MAX_LEN } from '@/lib/public-menu/table-label'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
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
  /** Locked table from `/{slug}/menu/t/{label}`; null on the shared menu URL. */
  tableLabel: string | null
  allowDineIn: boolean
  allowPickup: boolean
}

type CartLine = {
  menuItemId: number
  name: string
  price: number
  qty: number
}

type ActiveOrder = PublicMenuActiveOrder

type FeedbackSentiment = 'positive' | 'negative'

const PREP_POLL_MS = 5000

function guestPrepCopyKey(
  prepStatus: PublicMenuPrepStatus | null,
  fulfillmentMode: PublicMenuFulfillmentMode,
  variant: 'full' | 'short' = 'full',
): string | null {
  if (!prepStatus) return null
  const prefix = variant === 'short' ? 'order.prepStatusShort' : 'order.prepStatus'
  if (prepStatus === 'READY') {
    return fulfillmentMode === 'pickup' ? `${prefix}.ready_pickup` : `${prefix}.ready_dine_in`
  }
  return `${prefix}.${prepStatus.toLowerCase()}`
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
  allowDineIn,
  allowPickup,
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
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null)
  const [orderSheetOpen, setOrderSheetOpen] = useState(false)
  const [detailItemId, setDetailItemId] = useState<number | null>(null)
  const [feedbackSentiment, setFeedbackSentiment] = useState<FeedbackSentiment | null>(null)
  const [feedbackBody, setFeedbackBody] = useState('')
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const bothModes = allowDineIn && allowPickup
  const defaultGuestChoice: PublicMenuFulfillmentMode =
    allowPickup && !allowDineIn ? 'pickup' : allowDineIn && !allowPickup ? 'dine_in' : 'pickup'
  const [guestChoice, setGuestChoice] = useState<PublicMenuFulfillmentMode>(defaultGuestChoice)
  const [guestTableInput, setGuestTableInput] = useState('')
  const showModeToggle = bothModes && !tableLabel
  const needsGuestTable =
    !tableLabel && allowDineIn && (guestChoice === 'dine_in' || (allowDineIn && !allowPickup))

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
  const showStickyChrome = showFilters || showCategoryJump || Boolean(activeOrder)
  const activeOrderPrepKey = activeOrder
    ? guestPrepCopyKey(activeOrder.prepStatus, activeOrder.fulfillmentMode)
    : null
  const activeOrderPrepShortKey = activeOrder
    ? guestPrepCopyKey(activeOrder.prepStatus, activeOrder.fulfillmentMode, 'short')
    : null
  const activeOrderItemCount = activeOrder?.lines.length ?? 0

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

  // Fire-and-forget: credit open_menu_qr when a signed-in guest opens the menu.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    void fetch('/api/public-menu/point-earn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId,
        actionKey: POINT_EARN_ACTION_OPEN_MENU_QR,
      }),
    }).catch(() => {
      // Menu UX must not depend on Point System availability.
    })
  }, [isLoaded, isSignedIn, locationId])

  // Restore active order: localStorage first, then server open ticket for this guest.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false

    const restore = async () => {
      const stored = loadPublicMenuActiveOrder(locationId)
      if (stored) {
        if (!cancelled) setActiveOrder(stored)
        return
      }

      try {
        const res = await fetch(`/api/public-menu/orders/active?locationId=${locationId}`)
        if (!res.ok || cancelled) return
        const body = (await res.json()) as {
          order?: {
            orderId?: number
            billNumber?: string
            status?: string | null
            prepStatus?: string | null
            fulfillmentMode?: string | null
            tableLabel?: string | null
            lines?: Array<{ menuItemId: number; name: string }>
          } | null
        }
        const remote = body.order
        if (!remote?.orderId || !remote.billNumber || cancelled) return

        const status = normalizeTicketStatus(remote.status) ?? 'open'
        if (isTerminalTicketStatus(status)) return

        const fulfillmentMode =
          normalizeFulfillmentMode(remote.fulfillmentMode) ??
          (remote.tableLabel ? 'dine_in' : 'pickup')

        const nextOrder: ActiveOrder = {
          orderId: remote.orderId,
          billNumber: remote.billNumber,
          fulfillmentMode,
          tableLabel: remote.tableLabel?.trim() || null,
          prepStatus: normalizePrepStatus(remote.prepStatus),
          status,
          lines: Array.isArray(remote.lines)
            ? remote.lines.filter(
                (line) => typeof line?.menuItemId === 'number' && typeof line?.name === 'string',
              )
            : [],
          savedAt: Date.now(),
        }
        savePublicMenuActiveOrder(locationId, nextOrder)
        if (!cancelled) {
          setActiveOrder(nextOrder)
        }
      } catch {
        // Keep browsing without My order if restore fails.
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, locationId])

  // Poll ticket + prep status until paid/void/refunded.
  useEffect(() => {
    if (!activeOrder?.orderId) return
    if (isTerminalTicketStatus(activeOrder.status)) return

    const orderId = activeOrder.orderId
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/public-menu/orders/${orderId}`)
        if (!res.ok || cancelled) return
        const body = (await res.json()) as {
          status?: string | null
          prepStatus?: string | null
        }
        if (cancelled) return

        const bodyStatus = normalizeTicketStatus(body.status)
        if (bodyStatus && isTerminalTicketStatus(bodyStatus)) {
          clearPublicMenuActiveOrder(locationId)
          setActiveOrder(null)
          setOrderSheetOpen(false)
          return
        }

        setActiveOrder((prev) => {
          if (!prev || prev.orderId !== orderId) return prev
          const nextStatus = bodyStatus ?? normalizeTicketStatus(prev.status) ?? 'open'
          if (isTerminalTicketStatus(nextStatus)) {
            clearPublicMenuActiveOrder(locationId)
            return null
          }
          const nextPrep = normalizePrepStatus(body.prepStatus) ?? prev.prepStatus
          if (nextStatus === prev.status && nextPrep === prev.prepStatus) return prev
          const updated: ActiveOrder = {
            ...prev,
            status: nextStatus,
            prepStatus: nextPrep,
            savedAt: Date.now(),
          }
          savePublicMenuActiveOrder(locationId, updated)
          return updated
        })
      } catch {
        // Keep last known status on transient network errors.
      }
    }

    void poll()
    const timer = window.setInterval(() => {
      void poll()
    }, PREP_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeOrder?.orderId, activeOrder?.status, locationId])

  const openOrderSheet = () => {
    setOrderSheetOpen(true)
  }

  const openItemDrawer = (itemId: number) => {
    setDetailItemId(itemId)
    setFeedbackSentiment(null)
    setFeedbackBody('')
    setFeedbackError(null)
    setFeedbackSubmitted(false)
  }

  const addItem = (item: PublicMenuItemView) => {
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
    const returnPath = pathname || `/${encodeURIComponent(publicSlug)}/menu`
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

    const appendingTo = activeOrder
    let submitMode: PublicMenuFulfillmentMode
    let submitTableLabel: string | null

    if (appendingTo) {
      submitMode = appendingTo.fulfillmentMode
      submitTableLabel = appendingTo.tableLabel
    } else {
      const resolved = resolveGuestFulfillment({
        allowDineIn,
        allowPickup,
        lockedTableLabel: tableLabel,
        guestChoice,
        guestTableLabel: guestTableInput,
      })
      if (!resolved.ok) {
        setSubmitError(
          resolved.reason === 'table_required'
            ? t('order.tableRequired')
            : t('order.noFulfillmentModes'),
        )
        return
      }
      submitMode = resolved.mode
      submitTableLabel = resolved.tableLabel
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
          fulfillmentMode: submitMode,
          tableLabel: submitTableLabel,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        orderId?: number
        billNumber?: string
        fulfillmentMode?: 'DINE_IN' | 'PICKUP' | null
        prepStatus?: PublicMenuPrepStatus | null
        status?: string | null
        tableLabel?: string | null
        lines?: Array<{ menuItemId?: number; name?: string; qty?: number }>
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
      if (!body.billNumber || !body.orderId) {
        setSubmitError(t('order.submitFailed'))
        return
      }
      const successMode =
        body.fulfillmentMode === 'DINE_IN'
          ? 'dine_in'
          : body.fulfillmentMode === 'PICKUP'
            ? 'pickup'
            : submitMode
      const responseLines = Array.isArray(body.lines)
        ? body.lines.flatMap((line) =>
            typeof line?.menuItemId === 'number' && typeof line?.name === 'string'
              ? [{ menuItemId: line.menuItemId, name: line.name }]
              : [],
          )
        : null
      const wasAppend = Boolean(appendingTo && body.orderId === appendingTo.orderId)
      const orderedLines =
        responseLines && responseLines.length > 0
          ? responseLines
          : wasAppend && appendingTo
            ? [
                ...appendingTo.lines,
                ...cartLines.map((line) => ({
                  menuItemId: line.menuItemId,
                  name: line.name,
                })),
              ]
            : cartLines.map((line) => ({
                menuItemId: line.menuItemId,
                name: line.name,
              }))
      setCart({})
      clearPublicMenuCart(locationId)
      setBasketOpen(false)
      setGuestTableInput('')
      const nextOrder: ActiveOrder = {
        orderId: body.orderId,
        billNumber: body.billNumber,
        fulfillmentMode: successMode,
        tableLabel: body.tableLabel ?? submitTableLabel,
        prepStatus: normalizePrepStatus(body.prepStatus) ?? body.prepStatus ?? 'RECEIVED',
        status: normalizeTicketStatus(body.status) ?? 'open',
        lines: orderedLines,
        savedAt: Date.now(),
      }
      savePublicMenuActiveOrder(locationId, nextOrder)
      setActiveOrder(nextOrder)
      setOrderSheetOpen(true)
    } catch {
      setSubmitError(t('order.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const detailItem = detailItemId != null ? (itemsById.get(detailItemId) ?? null) : null

  async function submitItemFeedback() {
    if (!detailItem) return
    const body = feedbackBody.trim()
    if (feedbackSentiment === 'negative' && !body) {
      setFeedbackError(t('feedback.bodyRequiredNegative'))
      return
    }
    if (!feedbackSentiment && !body) {
      setFeedbackError(t('feedback.ratingOrBodyRequired'))
      return
    }
    if (!isSignedIn) {
      redirectToSignIn()
      return
    }

    setFeedbackSubmitting(true)
    setFeedbackError(null)
    try {
      const res = await fetch('/api/public-menu/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          menuItemId: detailItem.id,
          sentiment: feedbackSentiment,
          body: body || '',
        }),
      })
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string
        error?: string
      }
      if (res.status === 401) {
        redirectToSignIn()
        return
      }
      if (!res.ok) {
        setFeedbackError(payload.message || payload.error || t('feedback.submitFailed'))
        return
      }
      setFeedbackSubmitted(true)
      setFeedbackSentiment(null)
      setFeedbackBody('')
    } catch {
      setFeedbackError(t('feedback.submitFailed'))
    } finally {
      setFeedbackSubmitting(false)
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
      {showStickyChrome ? (
        <div className="bg-card/90 sticky top-14 z-20 -mx-6 flex flex-col gap-3 border-b px-6 py-3 backdrop-blur-sm sm:-mx-10 sm:px-10">
          {activeOrder ? (
            <button
              type="button"
              onClick={openOrderSheet}
              className="border-border/80 bg-background/70 hover:bg-background focus-visible:ring-ring flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              aria-label={t('order.myOrderStickyAria', {
                count: activeOrderItemCount,
                billNumber: activeOrder.billNumber,
              })}
            >
              <span
                aria-hidden
                className="bg-foreground/5 text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg"
              >
                <Receipt className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight">
                    {t('order.myOrderStickyLabel')}
                  </span>
                  {activeOrderItemCount > 0 ? (
                    <span className="bg-foreground text-background rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
                      {activeOrderItemCount}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                  {activeOrderPrepShortKey
                    ? t(activeOrderPrepShortKey)
                    : t('order.myOrderStickyMeta', { billNumber: activeOrder.billNumber })}
                </span>
              </span>
              <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
            </button>
          ) : null}
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
                        <button
                          type="button"
                          className="text-muted-foreground mt-1 w-fit text-left text-xs underline-offset-2 hover:underline"
                          onClick={() => openItemDrawer(item.id)}
                          aria-label={t('feedback.openItemDetails')}
                        >
                          {item.publishedFeedbackCount > 0
                            ? t('feedback.publishedCount', {
                                count: item.publishedFeedbackCount,
                              })
                            : t('feedback.openFeedback')}
                        </button>
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

      <Drawer
        open={orderSheetOpen && activeOrder != null}
        onOpenChange={(open) => {
          if (!open) setOrderSheetOpen(false)
        }}
      >
        <DrawerContent className="flex max-h-[min(90dvh,40rem)] flex-col gap-0 overflow-hidden">
          <DrawerHeader className="shrink-0 border-b text-left">
            <DrawerTitle>{t('order.myOrderSheetTitle')}</DrawerTitle>
            {activeOrder ? (
              <DrawerDescription>
                {activeOrder.fulfillmentMode === 'dine_in' && activeOrder.tableLabel
                  ? t('order.myOrderSheetDescriptionTable', {
                      billNumber: activeOrder.billNumber,
                      tableLabel: activeOrder.tableLabel,
                    })
                  : t('order.myOrderSheetDescription', {
                      billNumber: activeOrder.billNumber,
                    })}
              </DrawerDescription>
            ) : null}
          </DrawerHeader>
          <ScrollArea className="min-h-0 flex-1 overflow-hidden">
            <div className="flex flex-col gap-4 px-4 py-4">
              {activeOrderPrepKey ? (
                <p className="text-sm font-medium">{t(activeOrderPrepKey)}</p>
              ) : null}
              <div className="flex flex-col gap-2">
                <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {t('order.myOrderItemsHeading')}
                </h3>
                {activeOrder && activeOrder.lines.length > 0 ? (
                  <ul className="divide-border flex flex-col divide-y">
                    {activeOrder.lines.map((line, index) => (
                      <li
                        key={`${activeOrder.orderId}-${line.menuItemId}-${line.name}-${index}`}
                        className="py-2 text-sm first:pt-0 last:pb-0"
                      >
                        {line.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">{t('order.myOrderEmptyLines')}</p>
                )}
              </div>
            </div>
          </ScrollArea>
          <DrawerFooter className="shrink-0 border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex w-full flex-col gap-2">
              {hasCart ? (
                <>
                  <Button
                    type="button"
                    className="min-h-11 w-full touch-manipulation"
                    onClick={() => {
                      setOrderSheetOpen(false)
                      setBasketOpen(true)
                    }}
                  >
                    {t('order.viewBasket')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full touch-manipulation"
                    onClick={() => setOrderSheetOpen(false)}
                  >
                    {t('order.continueBrowsing')}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  className="min-h-11 w-full touch-manipulation"
                  onClick={() => setOrderSheetOpen(false)}
                >
                  {t('order.orderAnotherRound')}
                </Button>
              )}
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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
                {activeOrder ? (
                  <p className="text-muted-foreground text-sm font-medium">
                    {activeOrder.fulfillmentMode === 'dine_in' && activeOrder.tableLabel
                      ? t('order.tableLabelReadOnly', { label: activeOrder.tableLabel })
                      : t('order.fulfillmentPickup')}
                  </p>
                ) : tableLabel && allowDineIn ? (
                  <p className="text-muted-foreground text-sm font-medium">
                    {t('order.tableLabelReadOnly', { label: tableLabel })}
                  </p>
                ) : !showModeToggle && allowPickup && !allowDineIn ? (
                  <p className="text-muted-foreground text-sm font-medium">
                    {t('order.fulfillmentPickup')}
                  </p>
                ) : null}
              </div>
              {!activeOrder && showModeToggle ? (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    {t('order.fulfillmentLabel')}
                  </p>
                  <ToggleGroup
                    type="single"
                    value={guestChoice}
                    onValueChange={(value) => {
                      if (value === 'dine_in' || value === 'pickup') {
                        setGuestChoice(value)
                        setSubmitError(null)
                      }
                    }}
                    className="flex w-full justify-start gap-2"
                    aria-label={t('order.fulfillmentLabel')}
                  >
                    <ToggleGroupItem
                      value="pickup"
                      className="h-11 min-h-11 flex-1 touch-manipulation sm:h-9 sm:min-h-9"
                    >
                      {t('order.fulfillmentPickup')}
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="dine_in"
                      className="h-11 min-h-11 flex-1 touch-manipulation sm:h-9 sm:min-h-9"
                    >
                      {t('order.fulfillmentDineIn')}
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              ) : null}
              {!activeOrder && needsGuestTable ? (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="public-menu-guest-table" className="text-sm font-medium">
                    {t('order.tableInputLabel')}
                  </label>
                  <p className="text-muted-foreground text-xs">{t('order.tableInputHint')}</p>
                  <Input
                    id="public-menu-guest-table"
                    value={guestTableInput}
                    onChange={(e) => {
                      setGuestTableInput(e.target.value)
                      setSubmitError(null)
                    }}
                    placeholder={t('order.tableInputPlaceholder')}
                    maxLength={PUBLIC_MENU_TABLE_LABEL_MAX_LEN}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
              ) : null}
              {submitError ? (
                <Alert variant="destructive">
                  <AlertTitle>{t('order.submitFailedTitle')}</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}
              <Button
                type="button"
                className="min-h-11 w-full touch-manipulation"
                disabled={submitting || !isLoaded || !hasCart || (!allowDineIn && !allowPickup)}
                onClick={() => void submitOrder()}
              >
                {!isLoaded || submitting ? <Spinner /> : null}
                {!isLoaded
                  ? activeOrder
                    ? t('order.addingToOrder')
                    : t('order.sending')
                  : !isSignedIn
                    ? t('order.signInToOrder')
                    : submitting
                      ? activeOrder
                        ? t('order.addingToOrder')
                        : t('order.sending')
                      : activeOrder
                        ? t('order.addToOrder')
                        : t('order.send')}
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={detailItem != null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailItemId(null)
            setFeedbackSentiment(null)
            setFeedbackBody('')
            setFeedbackError(null)
            setFeedbackSubmitted(false)
          }
        }}
      >
        <DrawerContent className="flex max-h-[min(90dvh,40rem)] flex-col gap-0 overflow-hidden">
          <DrawerHeader className="shrink-0 border-b text-left">
            <DrawerTitle>
              {detailItem ? t('feedback.itemDrawerTitle', { name: detailItem.name }) : ''}
            </DrawerTitle>
            {detailItem?.description.trim() ? (
              <DrawerDescription>{detailItem.description.trim()}</DrawerDescription>
            ) : (
              <DrawerDescription>{t('feedback.writeDescription')}</DrawerDescription>
            )}
          </DrawerHeader>
          <ScrollArea className="min-h-0 flex-1 px-4 py-4">
            <div className="flex flex-col gap-6 pb-4">
              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold tracking-wide uppercase">
                  {t('feedback.writeHeading')}
                </h3>
                {feedbackSubmitted ? (
                  <p className="text-muted-foreground text-sm">{t('feedback.thanksBody')}</p>
                ) : !isLoaded ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : !isSignedIn ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-muted-foreground text-sm">{t('feedback.signInPrompt')}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 w-full touch-manipulation"
                      onClick={redirectToSignIn}
                    >
                      {t('feedback.signInCta')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>{t('feedback.sentimentLabel')}</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={feedbackSentiment === 'positive' ? 'default' : 'outline'}
                          className="min-h-11 flex-1 touch-manipulation"
                          onClick={() =>
                            setFeedbackSentiment((prev) =>
                              prev === 'positive' ? null : 'positive',
                            )
                          }
                          aria-pressed={feedbackSentiment === 'positive'}
                        >
                          <ThumbsUp className="size-4" />
                          {t('feedback.positive')}
                        </Button>
                        <Button
                          type="button"
                          variant={feedbackSentiment === 'negative' ? 'default' : 'outline'}
                          className="min-h-11 flex-1 touch-manipulation"
                          onClick={() =>
                            setFeedbackSentiment((prev) =>
                              prev === 'negative' ? null : 'negative',
                            )
                          }
                          aria-pressed={feedbackSentiment === 'negative'}
                        >
                          <ThumbsDown className="size-4" />
                          {t('feedback.negative')}
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="menu-item-feedback-body">
                        {feedbackSentiment === 'negative'
                          ? t('feedback.bodyLabelRequired')
                          : t('feedback.bodyLabel')}
                      </Label>
                      <Textarea
                        id="menu-item-feedback-body"
                        value={feedbackBody}
                        onChange={(e) => setFeedbackBody(e.target.value)}
                        placeholder={t('feedback.bodyPlaceholder')}
                        maxLength={280}
                        rows={3}
                        required={feedbackSentiment === 'negative'}
                        aria-required={feedbackSentiment === 'negative'}
                      />
                    </div>
                    {feedbackError ? (
                      <Alert variant="destructive">
                        <AlertDescription>{feedbackError}</AlertDescription>
                      </Alert>
                    ) : null}
                    <Button
                      type="button"
                      className="min-h-11 w-full touch-manipulation"
                      disabled={feedbackSubmitting}
                      onClick={() => void submitItemFeedback()}
                    >
                      {feedbackSubmitting ? <Spinner /> : null}
                      {feedbackSubmitting ? t('feedback.submitting') : t('feedback.submit')}
                    </Button>
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold tracking-wide uppercase">
                  {t('feedback.itemDrawerFeedbackHeading')}
                </h3>
                {detailItem && detailItem.publishedFeedbacks.length > 0 ? (
                  <ul className="flex flex-col gap-3">
                    {detailItem.publishedFeedbacks.map((note, index) => (
                      <li
                        key={`${detailItem.id}-fb-${index}`}
                        className="rounded-lg border p-3 text-sm"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          {note.sentiment === 'POSITIVE' ? (
                            <ThumbsUp className="size-3.5 shrink-0" aria-hidden />
                          ) : note.sentiment === 'NEGATIVE' ? (
                            <ThumbsDown className="size-3.5 shrink-0" aria-hidden />
                          ) : null}
                          <span className="font-medium">
                            {note.guestDisplayName?.trim() || t('feedback.guestAnonymous')}
                          </span>
                        </div>
                        <p className="text-pretty">{note.body}</p>
                        {note.ownerReply?.trim() ? (
                          <div className="border-muted mt-2 border-l-2 pl-3">
                            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                              {t('feedback.ownerReplyLabel')}
                            </p>
                            <p className="mt-1 text-pretty">{note.ownerReply}</p>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t('feedback.itemDrawerEmptyFeedback')}
                  </p>
                )}
              </section>
            </div>
          </ScrollArea>
          <DrawerFooter className="shrink-0 border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full touch-manipulation"
              onClick={() => setDetailItemId(null)}
            >
              {t('feedback.close')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
