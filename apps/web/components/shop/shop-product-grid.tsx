import Image from "next/image";

type Product = {
  title: string;
  subtitle: string;
  price: string;
  image: string;
  alt: string;
  colClass: string;
  imageAspect: string;
  titleClass: string;
  addToCartClass: string;
  mtClass?: string;
};

const products: Product[] = [
  {
    title: "Rustic Farm-to-Table Poster",
    subtitle: `Series: Organic Origins | 24x36"`,
    price: "$185.00",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDummuV71jm-AxhFQiQY5EPlVt_FpNdtIkgfjONTCWKPjfA2mmVN6GW_NmepoU_tW0L2FekljTbwwS8Cc9XDfN6A6gx5_6QLcFMhVoB6xozTQ8m35m3FDpjNTOS39Mcn1-VoIQrT1XQ6YDWc_rZLLNyx8SDKmN8k8tzRVRBKe9QKZMT8KWLL5mpWoNnPt3eB1onyGsfAXcWh71RUWmX6vBwDZb5JlcbMTm3ayV-eaQ917IrGoayei7WbmJh8YVmKi-PhCTvLBwCpd-S",
    alt: "Close up of a rustic farm-to-table vegetable arrangement",
    colClass: "col-span-12 md:col-span-8",
    imageAspect: "aspect-[16/9]",
    titleClass: "text-2xl",
    addToCartClass: "text-xs",
  },
  {
    title: "Minimalist Slate Menu Background",
    subtitle: "Digital Asset Bundle",
    price: "$45.00",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB24Ib5PeI1XZ4RzWnOqkdX8ZeJ9aHECYNhJCL6Zwy0W75nqC7EmbP0JEfvvKOtM7iUtLxMAG7orkL4Gar3_EqJOjR59_4fs8iFluUmklCyB2l_8wYdi-rIv0FJhoEI4hKTO1TsdpMnpxWzNzll3F9cQCUgKPZOSwVpUz7JbBbcMFDuD97kakPwuDEqUFMRaUC-QSbGBFwre-vydZcdb9pi3qJNmDlqxJA9jK9QOFe2_Aq2H46jqa5HLtVzT27DkaOhwDj-qin8yydu",
    alt: "Minimalist slate grey background with subtle stone textures",
    colClass: "col-span-12 md:col-span-4 mt-12",
    imageAspect: "aspect-[3/4]",
    titleClass: "text-lg leading-tight",
    addToCartClass: "text-[10px]",
  },
  {
    title: "Tuscany Terrace Fine Art Print",
    subtitle: "Limited Edition (1 of 50)",
    price: "$320.00",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCNg9F1cdzWiNDCxcUgLATGdEllfxszdPLEDF4v8hnwv2dY3pfocG8W_v-0cZ1FW7AoUd4x6PmypDsT_La-UjixrzVcAwr4gpDM5iECudVubWGuoh3jjiDrpHh1s3eRx_snMM9Bj0UepDoi4X2Ko_8HDOMAgBFD7EZdgNQuZL5-rfZATYQCYhVGep4191QrEn7v_K_mwzKPgDuQlBpaBOynHOccJq8_-HM2tcIcKPoz2AZN9RMnQ4eVQ_8Kd5b491yVKQBgA5bhOi7H",
    alt: "Italian terrace overlook in Tuscany at golden hour",
    colClass: "col-span-12 md:col-span-4 -mt-8",
    imageAspect: "aspect-[4/5]",
    titleClass: "text-lg",
    addToCartClass: "text-[10px]",
  },
  {
    title: "Artisan Spice Still Life",
    subtitle: `Kitchen Collection | 18x18"`,
    price: "$120.00",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAiaTjdjNKFDBx1-9mRAxfRr8AjVgvcSfYnpywAxFjLmm_A6aKS1b2ylJEhDRqDQ4tdBENafSJ-8wn2WTmlfNiJjbDuahV_47aTy5CVfMhke54in_9gq_N1xeqCTBglUW0GmLM_UeoxOot9V6fs77_5fyY8wWSnzZXTu5sKWCe3xjFWKSv18cnCs-PdkQiohMaMsF72A4V_BYc3cOuCLkCUuGZzi-sbJNFQJKzt8YoeOko6uF2VxDxuW27Z1e714HbII2lmwok_N0QY",
    alt: "Still life photography of artisan ingredients",
    colClass: "col-span-12 md:col-span-4 mt-16",
    imageAspect: "aspect-square",
    titleClass: "text-lg leading-tight",
    addToCartClass: "text-[10px]",
  },
  {
    title: "Modern Café Series #04",
    subtitle: "Matte Canvas Print",
    price: "$155.00",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAuIwVc5bP74DCQO5JNFT1VEp9u2sAzK1k20E_F1NHQRwjP5NRjNdHbDFG7YfH76ow2VP72ziayaGfCdMDXibjXK_PMz_u6a-PkTADA8qCLwZ5gyK2dBfUL1Wjtq1Ne1MqELPknp-3eZu6PbR4YYSkUYSkrErz-gjP6mraPfLnbkf8uenvp5U0jyVZyhx_2-MN1JKLxiKbV9Zurfx7yBlyvvCTTupcDgjEPB_mrLHFzJM3lS_tL0laSaoWoW2W9vufQEQW7g440NDTi",
    alt: "Aerial shot of modern minimalist coffee cups on marble",
    colClass: "col-span-12 md:col-span-4",
    imageAspect: "aspect-[4/5]",
    titleClass: "text-lg leading-tight",
    addToCartClass: "text-[10px]",
  },
];

export function ShopProductGrid() {
  return (
    <section className="shop-editorial-grid mb-32">
      {products.map((p) => (
        <div
          key={p.title}
          className={`group cursor-pointer ${p.colClass}`}
        >
          <div
            className={`mb-6 overflow-hidden rounded-md bg-[#f4f4f0] ${p.imageAspect} relative`}
          >
            <Image
              src={p.image}
              alt={p.alt}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h3
                className={`font-[family-name:var(--font-shop-headline)] font-bold text-[#2f3430] ${p.titleClass}`}
              >
                {p.title}
              </h3>
              <p
                className={`mt-1 text-[#5c605c] ${p.titleClass.includes("text-2xl") ? "" : "text-sm"}`}
              >
                {p.subtitle}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`font-[family-name:var(--font-shop-headline)] font-bold text-[#56642b] ${p.titleClass.includes("text-2xl") ? "text-xl" : "text-lg"}`}
              >
                {p.price}
              </p>
              <button
                type="button"
                className={`mt-2 font-bold uppercase tracking-widest text-[#934b28] transition-opacity hover:opacity-80 ${p.addToCartClass}`}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
