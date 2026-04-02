"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Minus, Plus, Share2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { routes } from "@/lib/routes";

import type { ShopProduct } from "./shop-catalog";

type Props = {
  product: ShopProduct;
};

export function ShopProductDetail({ product }: Props) {
  const [imageIndex, setImageIndex] = useState(0);
  const [sizeId, setSizeId] = useState(product.sizes[0]?.id ?? "");
  const [finishId, setFinishId] = useState(product.finishes[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const images = product.images;
  const active = images[imageIndex] ?? images[0];

  const selectedSize = useMemo(
    () => product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0],
    [product.sizes, sizeId],
  );

  const lineTotal = useMemo(() => {
    if (!selectedSize) return "—";
    const n = Number.parseFloat(selectedSize.price.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(n)) return selectedSize.price;
    const total = n * quantity;
    return `$${total.toFixed(2)}`;
  }, [quantity, selectedSize]);

  const goPrev = useCallback(() => {
    setImageIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setImageIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  const handleShare = useCallback(async () => {
    const url =
      typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.title,
          text: product.subtitle,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled or clipboard denied */
    }
  }, [product.subtitle, product.title]);

  const handleAddToCart = useCallback(() => {
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  }, []);

  const bumpQty = (delta: number) => {
    setQuantity((q) => Math.min(20, Math.max(1, q + delta)));
  };

  return (
    <div className="mb-24">
      <nav
        className="mb-10 text-sm text-[#5c605c]"
        aria-label="Breadcrumb"
      >
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href={routes.shop}
              className="font-medium text-[#934b28] underline-offset-4 hover:underline"
            >
              Shop
            </Link>
          </li>
          <li aria-hidden className="text-[#b0b3ae]">
            /
          </li>
          <li className="font-[family-name:var(--font-shop-headline)] text-[#2f3430]">
            {product.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <div className="relative overflow-hidden rounded-xl bg-[#f4f4f0] aspect-[4/5] sm:aspect-[3/4]">
            {active ? (
              <Image
                src={active.src}
                alt={active.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 58vw"
                priority
              />
            ) : null}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent pt-24 pb-4 px-4">
              <p className="text-xs font-medium uppercase tracking-widest text-white/90">
                {active?.label}
              </p>
            </div>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#faf9f6]/90 text-[#2f3430] shadow-sm transition hover:bg-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#faf9f6]/90 text-[#2f3430] shadow-sm transition hover:bg-white"
              aria-label="Next image"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={`${product.slug}-thumb-${i}`}
                type="button"
                onClick={() => setImageIndex(i)}
                className={`relative size-20 shrink-0 overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-[#faf9f6] transition ${
                  i === imageIndex
                    ? "ring-[#56642b]"
                    : "ring-transparent opacity-80 hover:opacity-100"
                }`}
                aria-label={`Show ${img.label}`}
                aria-pressed={i === imageIndex}
              >
                <Image
                  src={img.src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#934b28]">
            Print on demand
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-shop-headline)] text-3xl font-extrabold tracking-tight text-[#2f3430] md:text-4xl">
            {product.title}
          </h1>
          <p className="mt-2 text-lg text-[#5c605c]">{product.subtitle}</p>

          <div className="mt-8 flex flex-wrap items-end gap-4 border-b border-[#e8e6e1] pb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5c605c]">
                From
              </p>
              <p className="font-[family-name:var(--font-shop-headline)] text-3xl font-bold text-[#56642b]">
                {selectedSize?.price ?? "—"}
              </p>
              <p className="mt-1 text-sm text-[#5c605c]">
                Line total ({quantity}):{" "}
                <span className="font-semibold text-[#2f3430]">
                  {lineTotal}
                </span>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto border-[#d4d1ca] text-[#2f3430]"
              onClick={handleShare}
            >
              <Share2 className="mr-2 size-4" />
              Share
            </Button>
          </div>

          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <label
                className="text-xs font-bold uppercase tracking-wider text-[#2f3430]"
                htmlFor="shop-size"
              >
                Size or license
              </label>
              <Select value={sizeId} onValueChange={setSizeId}>
                <SelectTrigger
                  id="shop-size"
                  className="w-full border-[#d4d1ca] bg-white"
                >
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {product.sizes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label} — {s.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                className="text-xs font-bold uppercase tracking-wider text-[#2f3430]"
                htmlFor="shop-finish"
              >
                Finish / color profile
              </label>
              <Select value={finishId} onValueChange={setFinishId}>
                <SelectTrigger
                  id="shop-finish"
                  className="w-full border-[#d4d1ca] bg-white"
                >
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {product.finishes.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2f3430]">
                Quantity
              </span>
              <div className="flex items-center rounded-lg border border-[#d4d1ca] bg-white">
                <button
                  type="button"
                  className="flex size-10 items-center justify-center text-[#2f3430] transition hover:bg-[#f4f4f0]"
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
                  className="flex size-10 items-center justify-center text-[#2f3430] transition hover:bg-[#f4f4f0]"
                  onClick={() => bumpQty(1)}
                  aria-label="Increase quantity"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            <Button
              type="button"
              className="h-12 w-full bg-[#56642b] text-[#faf9f6] hover:bg-[#465522]"
              onClick={handleAddToCart}
            >
              {added ? "Added (demo)" : "Add to cart"}
            </Button>
            {added ? (
              <p className="text-center text-sm text-[#5c605c]">
                Checkout is not connected yet—this is a preview.
              </p>
            ) : null}
          </div>

          <div className="mt-10 space-y-4 text-[#5c605c]">
            <h2 className="font-[family-name:var(--font-shop-headline)] text-lg font-bold text-[#2f3430]">
              About this piece
            </h2>
            <p className="leading-relaxed">{product.description}</p>
          </div>

          <Accordion
            type="single"
            collapsible
            className="mt-10 w-full border-t border-[#e8e6e1]"
          >
            <AccordionItem value="shipping">
              <AccordionTrigger className="font-[family-name:var(--font-shop-headline)] text-[#2f3430] hover:no-underline">
                Production and shipping
              </AccordionTrigger>
              <AccordionContent className="text-[#5c605c] leading-relaxed">
                Each order is printed after checkout—allow 3–5 business days for
                production plus transit time. Tracking is sent when your package
                leaves our partner lab. International delivery may incur duties.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="returns">
              <AccordionTrigger className="font-[family-name:var(--font-shop-headline)] text-[#2f3430] hover:no-underline">
                Returns and reprints
              </AccordionTrigger>
              <AccordionContent className="text-[#5c605c] leading-relaxed">
                Because pieces are made to order, returns are limited to damage
                in transit or print defects—contact us within 14 days with
                photos of the packaging and item. Color variation up to 10%
                versus your screen is normal for giclée and canvas.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="care">
              <AccordionTrigger className="font-[family-name:var(--font-shop-headline)] text-[#2f3430] hover:no-underline">
                Care
              </AccordionTrigger>
              <AccordionContent className="text-[#5c605c] leading-relaxed">
                Handle framed and canvas works with clean, dry hands. Dust
                lightly with a soft microfiber cloth; avoid household cleaners
                on the print surface. Keep out of direct sunlight to preserve
                color for years in hospitality environments.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Link
            href={routes.shop}
            className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-[#934b28] underline-offset-4 hover:underline"
          >
            <ChevronLeft className="size-4" />
            Back to shop
          </Link>
        </div>
      </div>
    </div>
  );
}
