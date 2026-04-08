'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Minus, Plus, Share2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'

import { Button } from '@workspace/ui/components/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import { Field, FieldContent, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import type { ResolvedShopImage } from '@/lib/shop/resolve-shop-images'
import { routes } from '@/lib/routes'

import type { ShopProduct } from './shop-catalog'

type Props = {
  product: ShopProduct
  resolvedImages: ResolvedShopImage[]
}

export function ShopProductDetail({ product, resolvedImages }: Props) {
  const t = useTranslations('shop')
  const [imageIndex, setImageIndex] = useState(0)
  const [sizeId, setSizeId] = useState(product.sizes[0]?.id ?? '')
  const [finishId, setFinishId] = useState(product.finishes[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')

  const images = resolvedImages
  const active = images[imageIndex] ?? images[0]
  const hasGallery = images.length > 0
  const showCarouselNav = images.length > 1

  const goPrev = useCallback(() => {
    setImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))
  }, [images.length])

  const goNext = useCallback(() => {
    setImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))
  }, [images.length])

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.title,
          text: product.subtitle,
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setShareStatus('copied')
        window.setTimeout(() => setShareStatus('idle'), 3_000)
      }
    } catch {
      /* user cancelled or clipboard denied */
    }
  }, [product.subtitle, product.title])

  const bumpQty = (delta: number) => {
    setQuantity((q) => Math.min(20, Math.max(1, q + delta)))
  }

  if (resolvedImages.length === 0) {
    return (
      <div className="mb-24">
        <nav className="mb-10 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={routes.shop} className="font-medium text-primary">
                {t('pdp.breadcrumbShop')}
              </Link>
            </li>
          </ol>
        </nav>
        <div
          className="flex flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center"
          aria-live="polite"
        >
          <p className="max-w-md text-muted-foreground">{t('noImagesAvailable')}</p>
          <Link
            href={routes.shop}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            <ChevronLeft className="size-4" data-icon="inline-start" />
            {t('pdp.backToShop')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-24">
      {shareStatus === 'copied' ? (
        <p className="sr-only" aria-live="polite">
          {t('pdp.shareCopied')}
        </p>
      ) : null}
      <nav className="mb-10 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href={routes.shop} className="font-medium text-primary">
              {t('pdp.breadcrumbShop')}
            </Link>
          </li>
          <li aria-hidden className="text-muted-foreground/70">
            /
          </li>
          <li className="font-[family-name:var(--font-shop-headline)] text-foreground">
            {product.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted sm:aspect-[3/4]">
            {hasGallery && active ? (
              <>
                <Image
                  src={active.src}
                  alt={active.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  priority
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent px-4 pb-4 pt-24">
                  <p className="text-xs font-medium uppercase tracking-widest text-white/90">
                    {active.label}
                  </p>
                </div>
              </>
            ) : null}
            {showCarouselNav ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition hover:bg-muted"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition hover:bg-muted"
                  aria-label="Next image"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            ) : null}
          </div>

          {hasGallery ? (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={`${product.slug}-thumb-${i}`}
                  type="button"
                  onClick={() => setImageIndex(i)}
                  className={`relative size-20 shrink-0 overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-background transition ${
                    i === imageIndex ? 'ring-ring' : 'ring-transparent opacity-80 hover:opacity-100'
                  }`}
                  aria-label={`Show ${img.label}`}
                  aria-pressed={i === imageIndex}
                >
                  <Image src={img.src} alt="" fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="lg:col-span-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {t('pdp.printOnDemand')}
          </p>
          <h1 className="text-balance mt-2 font-[family-name:var(--font-shop-headline)] text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {product.title}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{product.subtitle}</p>

          <div className="mt-8 flex flex-wrap items-center justify-end gap-4 border-b border-border pb-8">
            <Button type="button" variant="outline" size="sm" onClick={handleShare}>
              <Share2 data-icon="inline-start" />
              {t('pdp.share')}
            </Button>
          </div>

          <FieldGroup className="mt-8">
            <Field>
              <FieldLabel htmlFor="shop-size">{t('pdp.sizeOrLicense')}</FieldLabel>
              <FieldContent>
                <Select value={sizeId} onValueChange={setSizeId}>
                  <SelectTrigger id="shop-size" className="w-full">
                    <SelectValue placeholder={t('pdp.choosePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {product.sizes.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="shop-finish">{t('pdp.finishOrProfile')}</FieldLabel>
              <FieldContent>
                <Select value={finishId} onValueChange={setFinishId}>
                  <SelectTrigger id="shop-finish" className="w-full">
                    <SelectValue placeholder={t('pdp.choosePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {product.finishes.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>

            <Field orientation="horizontal">
              <FieldLabel className="shrink-0">{t('pdp.quantity')}</FieldLabel>
              <FieldContent>
                <div className="flex items-center rounded-lg border border-border bg-background">
                  <button
                    type="button"
                    className="flex size-10 items-center justify-center text-foreground transition hover:bg-muted"
                    onClick={() => bumpQty(-1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="flex size-10 items-center justify-center text-foreground transition hover:bg-muted"
                    onClick={() => bumpQty(1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </FieldContent>
            </Field>
          </FieldGroup>

          <Button type="button" className="mt-8 h-12 w-full" disabled>
            {t('pdp.addToCartDisabled')}
          </Button>
          <p className="mt-3 text-center text-sm text-muted-foreground">{t('pdp.checkoutHint')}</p>

          <div className="mt-10 text-muted-foreground">
            <h2 className="font-[family-name:var(--font-shop-headline)] text-lg font-bold text-foreground">
              {t('pdp.aboutPiece')}
            </h2>
            <p className="mt-2 leading-relaxed">{product.description}</p>
          </div>

          <Accordion type="single" collapsible className="mt-10 w-full border-t border-border">
            <AccordionItem value="shipping">
              <AccordionTrigger className="font-[family-name:var(--font-shop-headline)] hover:no-underline">
                {t('pdp.accordionShippingTitle')}
              </AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">
                {t('pdp.accordionShippingBody')}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="returns">
              <AccordionTrigger className="font-[family-name:var(--font-shop-headline)] hover:no-underline">
                {t('pdp.accordionReturnsTitle')}
              </AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">
                {t('pdp.accordionReturnsBody')}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="care">
              <AccordionTrigger className="font-[family-name:var(--font-shop-headline)] hover:no-underline">
                {t('pdp.accordionCareTitle')}
              </AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">
                {t('pdp.accordionCareBody')}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Link
            href={routes.shop}
            className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            <ChevronLeft className="size-4" data-icon="inline-start" />
            {t('pdp.backToShop')}
          </Link>
        </div>
      </div>
    </div>
  )
}
