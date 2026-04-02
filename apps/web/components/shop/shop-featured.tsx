import Image from "next/image";

const IMG_A =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDEDtwNL9UhLNLTpvDQ2UnTzTPatMvs84VxnM4i9bzOx_0lscvP_rEKIGIdyKLM3Lg24hGXwSKPEHhnqoTNiZcfvibbCxeHoQSVHTNtDfAJyjuDad_WZCplw-utQ0HN_IdFd-GsX2qs6sXeMUKzFLWAoSW3mfHKCWewp4FKGGbvcCQTewvfULB8V__GY97ulQLDGC5D9FUZQgX_9xfwlhmxGkFLbAnnBRZcwA5kUcQKDkfig5I2HordaOgFtD-CCr52sBB-JJuuLKxV";

const IMG_B =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBjzfUyudrERLBnnMWr8x2G4-gbdJ__sUfslOmod79E1dn9dBqMCG8rkYNX03iEHbS5jcS6NsQssw7HJdZd8LqPcnKOfnxEeojlE4hxLmq_0FHkfUKUduCM8B2vzKYnCPq8n9uB9Guqwafhm7HuXs7ushZfh7-f-FtE3vt3D0UI34AZvVA2O6ELOwni-GZZ5NzH0KWFIisggabwWOaFoQheNFkifs4eO9Ncb813i7TRw4Dy_F0vq6ZxAiIYosC0-VSELZo4rEhoNpfh";

export function ShopFeatured() {
  return (
    <section className="mb-32 flex flex-col items-center gap-16 rounded-xl bg-[#f4f4f0] p-12 md:flex-row md:p-20">
      <div className="md:w-1/2">
        <h2 className="mb-6 font-[family-name:var(--font-shop-headline)] text-4xl font-extrabold leading-tight text-[#2f3430]">
          Bespoke Curation for Your Concept
        </h2>
        <p className="mb-8 text-lg leading-relaxed text-[#5c605c]">
          Looking for something completely unique to your restaurant&apos;s
          brand? Our artists create custom collections tailored to your interior
          design and menu philosophy.
        </p>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            className="rounded-full bg-[#934b28] px-10 py-4 text-sm font-bold text-[#fff7f5] shadow-lg shadow-[#934b28]/20"
          >
            Request Custom Quote
          </button>
          <button
            type="button"
            className="rounded-full border-2 border-[#afb3ae] px-10 py-4 text-sm font-bold text-[#2f3430]"
          >
            View Case Studies
          </button>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-4 md:w-1/2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg shadow-sm">
          <Image
            src={IMG_A}
            alt="Abstract painter working on a large canvas in a bright studio"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
        <div className="relative mt-8 aspect-[4/5] overflow-hidden rounded-lg shadow-sm">
          <Image
            src={IMG_B}
            alt="Premium art print texture on heavy archival paper"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
      </div>
    </section>
  );
}
