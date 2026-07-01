'use client'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@workspace/ui/components/carousel'
import { Dialog, DialogContent, DialogTitle } from '@workspace/ui/components/dialog'
import { cn } from '@workspace/ui/lib/utils'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

export type HeroPreviewSlide = {
  id: string
  imageSrc: string
  alt: string
  caption: string
}

export type HeroProductPreviewProps = {
  slides: readonly HeroPreviewSlide[]
  viewLargerLabel: string
  carouselLabel: string
  carouselPrevLabel: string
  carouselNextLabel: string
  carouselDotLabels: readonly string[]
  modalTitle: string
  /** Use full container width (e.g. stacked landing sections) instead of hero max-width. */
  fullWidth?: boolean
  /** `large` — taller frame and wider layout for portfolio / landing hero use. */
  size?: 'default' | 'large' | 'hero'
}

const HERO_IMAGE_SIZES =
  '(max-width: 640px) 100vw, (max-width: 1152px) min(100vw - 3rem, 1024px), 1024px'

const LARGE_HERO_IMAGE_SIZES =
  '(max-width: 640px) 100vw, (max-width: 1280px) min(100vw - 2rem, 1280px), 1280px'

const FULL_WIDTH_IMAGE_SIZES = '(max-width: 1152px) 100vw, 1152px'

const LARGE_FULL_WIDTH_IMAGE_SIZES = '(max-width: 1536px) 100vw, 1400px'

const carouselNavButtonBaseClassName = cn(
  'flex shrink-0 touch-manipulation items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-sm transition',
  'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  'disabled:pointer-events-none disabled:opacity-40',
)

/** Above-the-fold product screenshots (LCP on first slide). */
export function HeroProductPreview({
  slides,
  viewLargerLabel,
  carouselLabel,
  carouselPrevLabel,
  carouselNextLabel,
  carouselDotLabels,
  modalTitle,
  fullWidth = false,
  size = 'default',
}: HeroProductPreviewProps) {
  const isLarge = size === 'large'
  const isHero = size === 'hero'
  const imageSizes = fullWidth
    ? isLarge || isHero
      ? LARGE_FULL_WIDTH_IMAGE_SIZES
      : FULL_WIDTH_IMAGE_SIZES
    : isLarge || isHero
      ? LARGE_HERO_IMAGE_SIZES
      : HERO_IMAGE_SIZES
  const aspectClassName = isHero
    ? 'relative w-full h-[min(34dvh,16rem)] sm:h-[min(38dvh,20rem)] md:h-[min(42dvh,24rem)] lg:h-[min(46dvh,28rem)] xl:h-[min(50dvh,32rem)]'
    : isLarge
      ? 'aspect-[16/11] min-h-[220px] sm:aspect-[3/2] sm:min-h-[280px] md:min-h-[360px] lg:min-h-[440px] xl:min-h-[520px]'
      : 'aspect-video'
  const navButtonSizeClassName = isLarge || isHero ? 'size-12' : 'size-10'
  const [api, setApi] = useState<CarouselApi>()
  const [activeIndex, setActiveIndex] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const activeSlide = slides[activeIndex] ?? slides[0]
  const showNav = slides.length > 1

  const syncCarouselState = useCallback((carouselApi: CarouselApi | undefined) => {
    if (!carouselApi) return
    setActiveIndex(carouselApi.selectedScrollSnap())
    setCanScrollPrev(carouselApi.canScrollPrev())
    setCanScrollNext(carouselApi.canScrollNext())
  }, [])

  useEffect(() => {
    if (!api) return

    syncCarouselState(api)
    const onSelect = () => syncCarouselState(api)
    api.on('reInit', onSelect)
    api.on('select', onSelect)

    return () => {
      api.off('select', onSelect)
      api.off('reInit', onSelect)
    }
  }, [api, syncCarouselState])

  const openModal = () => setModalOpen(true)

  return (
    <figure
      className={cn(
        'mx-auto w-full min-w-0',
        isHero
          ? 'mt-0 max-w-none'
          : fullWidth || isLarge
            ? 'mt-8 max-w-none md:mt-10'
            : 'mt-10 max-w-5xl md:mt-12',
      )}
    >
      <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none">
        <Carousel
          setApi={setApi}
          opts={{ loop: true }}
          className="w-full"
          aria-label={carouselLabel}
        >
          <div className="flex w-full items-center gap-2 sm:gap-3 md:gap-4">
            {showNav ? (
              <button
                type="button"
                onClick={() => api?.scrollPrev()}
                disabled={!canScrollPrev}
                className={cn(
                  carouselNavButtonBaseClassName,
                  navButtonSizeClassName,
                  'hidden lg:flex',
                )}
                aria-label={carouselPrevLabel}
              >
                <ChevronLeft className={cn(isLarge || isHero ? 'size-6' : 'size-5')} aria-hidden />
              </button>
            ) : null}

            <div
              className={cn(
                'min-w-0 flex-1 overflow-hidden border border-border bg-muted/20 shadow-sm',
                isLarge || isHero ? 'rounded-3xl' : 'rounded-2xl',
              )}
            >
              <CarouselContent className="ml-0">
                {slides.map((slide, index) => (
                  <CarouselItem key={slide.id} className="basis-full pl-0">
                    <button
                      type="button"
                      onClick={openModal}
                      className="group relative block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label={`${viewLargerLabel}: ${slide.alt}`}
                    >
                      <div className={cn('relative w-full min-w-0 bg-muted/30', aspectClassName)}>
                        <Image
                          src={slide.imageSrc}
                          alt={slide.alt}
                          fill
                          className="object-contain object-center"
                          priority={index === 0}
                          loading={index === 0 ? undefined : 'lazy'}
                          sizes={imageSizes}
                        />
                        <span
                          className={cn(
                            'pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 font-medium text-foreground shadow-sm backdrop-blur-sm transition group-hover:bg-background',
                            isLarge || isHero ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs',
                          )}
                        >
                          <ZoomIn
                            className={cn('shrink-0', isLarge || isHero ? 'size-4' : 'size-3.5')}
                            aria-hidden
                          />
                          {viewLargerLabel}
                        </span>
                      </div>
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {showNav && !isHero ? (
                <div className="flex items-center justify-center gap-4 border-t border-border/40 bg-muted/10 px-4 py-2.5 lg:hidden">
                  <button
                    type="button"
                    onClick={() => api?.scrollPrev()}
                    disabled={!canScrollPrev}
                    className={cn(carouselNavButtonBaseClassName, navButtonSizeClassName)}
                    aria-label={carouselPrevLabel}
                  >
                    <ChevronLeft
                      className={cn(isLarge || isHero ? 'size-6' : 'size-5')}
                      aria-hidden
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => api?.scrollNext()}
                    disabled={!canScrollNext}
                    className={cn(carouselNavButtonBaseClassName, navButtonSizeClassName)}
                    aria-label={carouselNextLabel}
                  >
                    <ChevronRight
                      className={cn(isLarge || isHero ? 'size-6' : 'size-5')}
                      aria-hidden
                    />
                  </button>
                </div>
              ) : null}

              {showNav ? (
                <div
                  className={cn(
                    'flex justify-center gap-2 border-t border-border/40 bg-muted/10 px-4',
                    isLarge || isHero ? 'py-3' : 'py-3',
                  )}
                  role="tablist"
                  aria-label={carouselLabel}
                >
                  {slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={index === activeIndex}
                      aria-current={index === activeIndex ? 'true' : undefined}
                      aria-label={carouselDotLabels[index]}
                      onClick={() => api?.scrollTo(index)}
                      className={cn(
                        'rounded-full transition',
                        isLarge || isHero ? 'size-3' : 'size-2.5',
                        index === activeIndex
                          ? 'scale-110 bg-primary'
                          : 'bg-muted-foreground/35 hover:bg-muted-foreground/55',
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {showNav ? (
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                disabled={!canScrollNext}
                className={cn(
                  carouselNavButtonBaseClassName,
                  navButtonSizeClassName,
                  'hidden lg:flex',
                )}
                aria-label={carouselNextLabel}
              >
                <ChevronRight className={cn(isLarge || isHero ? 'size-6' : 'size-5')} aria-hidden />
              </button>
            ) : null}
          </div>
        </Carousel>
      </div>

      {activeSlide ? (
        <figcaption
          className={cn(
            'mt-3 text-pretty text-center leading-relaxed text-foreground/70',
            isHero
              ? 'line-clamp-2 px-2 text-sm md:mx-auto md:max-w-3xl'
              : isLarge
                ? 'max-w-4xl px-2 text-base md:mx-auto md:text-lg'
                : 'text-sm',
          )}
        >
          {activeSlide.caption}
        </figcaption>
      ) : null}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        {activeSlide ? (
          <DialogContent
            key={activeSlide.id}
            overlayClassName="bg-black/80 backdrop-blur-sm"
            showCloseButton
            className={cn(
              'inset-0 top-0 left-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-2xl',
              'sm:inset-auto sm:top-[50%] sm:left-[50%] sm:h-[96dvh] sm:max-h-[96dvh] sm:w-[min(98vw,1600px)] sm:max-w-[min(98vw,1600px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg',
            )}
          >
            <DialogTitle className="sr-only">{modalTitle}</DialogTitle>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-muted/20 via-muted/10 to-muted/5 px-3 py-4 sm:px-6 sm:py-6">
              <Image
                src={activeSlide.imageSrc}
                alt={activeSlide.alt}
                width={3840}
                height={2160}
                className="h-auto max-h-[calc(100dvh-5.5rem)] w-auto max-w-full object-contain sm:max-h-[calc(96dvh-5.5rem)]"
                sizes="100vw"
                quality={90}
                priority
              />
            </div>
            <p className="shrink-0 border-t border-border/60 px-4 py-3 pr-14 text-center text-sm leading-relaxed text-muted-foreground">
              {activeSlide.caption}
            </p>
          </DialogContent>
        ) : null}
      </Dialog>
    </figure>
  )
}
