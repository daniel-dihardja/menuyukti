import Image from "next/image";

const HERO_SRC =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBG2RJcuH_QtDl2XUX2CJ_UheN3y5EHQ4KhdXOYo4H5mPj3FBSXrPv9hY7PRXsBudv2KLmqsPdmStxcqTCb0dagNtS8X_1PAgQeq49fdcTkABdXLBrFuHZ8ArbpyPM6QYClGbXTR0eMk2lLrE0TQteovzbglWJEYEBjUjF_8qT6wQUCBhdKPauuYvN3mgMRCrsmKWB2VXtKilSye3PHRTW4rMfpGWN8ncYbp9mbmbWjYVavNrKyH3_-aCqwlQPNTYtkdxmEStZ070UK";

export function ShopHero() {
  return (
    <section className="relative mb-24 mt-8 overflow-hidden rounded-xl">
      <div className="relative aspect-[21/9] w-full overflow-hidden">
        <Image
          src={HERO_SRC}
          alt="Interior of a minimalist art gallery with soft natural light"
          fill
          className="object-cover grayscale-[20%]"
          sizes="(max-width: 1440px) 100vw, 1440px"
          priority
        />
      </div>
      <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/40 to-transparent px-8 md:px-16">
        <div className="max-w-2xl text-white">
          <span className="mb-4 block font-[family-name:var(--font-shop-headline)] text-sm font-bold uppercase tracking-[0.2em] opacity-80">
            Editorial Collection
          </span>
          <h1 className="font-[family-name:var(--font-shop-headline)] text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl">
            The Digital Curator: Art for Your Restaurant
          </h1>
          <p className="mt-6 max-w-lg text-xl font-light leading-relaxed text-white">
            Elevate your culinary space with bespoke prints designed for the
            modern restaurateur.
          </p>
        </div>
      </div>
    </section>
  );
}
