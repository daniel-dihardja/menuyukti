import Image from "next/image";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { routes } from "@/lib/routes";
import { getTranslations } from "next-intl/server";
import {
  Printer,
  Frame,
  FileImage,
  CreditCard,
  Store,
  Shirt,
  Package,
  ShoppingBag,
  ImagePlus,
  Truck,
} from "lucide-react";

export default async function ShopPage() {
  const t = await getTranslations("shop");

  return (
    <div className="min-h-screen bg-background text-foreground relative pb-24 md:pb-0">
      {/* Sticky Header */}
      <header className="w-full sticky top-0 z-50 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">
              Menuyukti Print
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-foreground/70">
            <Link
              href="#categories"
              className="hover:text-foreground transition-colors"
            >
              Products
            </Link>
            <Link
              href="#how"
              className="hover:text-foreground transition-colors"
            >
              How it works
            </Link>
          </nav>

        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full min-h-[calc(100vh-4rem)] flex items-center bg-background">
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold leading-tight max-w-4xl px-3 py-2 mx-auto">
            {t("hero.headline")}
          </h2>

          <p className="mt-4 text-base md:text-lg text-foreground/80 max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>

          <div className="mt-8 hidden md:flex w-full justify-center">
            <Button size="lg" variant="default" asChild>
              <Link href="#categories">{t("hero.ctaPrimary")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="bg-muted">
        <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="order-1 md:order-2 w-full h-full overflow-hidden shadow-lg">
            <Image
              src="https://picsum.photos/seed/restaurant-interior/1024/768"
              alt="Restaurant print products"
              width={1024}
              height={768}
            />
          </div>

          <div className="order-2 md:order-1">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/90">
              {t("intro")}
            </p>
          </div>
        </div>
      </section>

      {/* Product Categories Section */}
      <section id="categories" className="bg-background py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
            {t("categories.title")}
          </h2>
          <p className="text-center text-foreground/80 max-w-3xl mx-auto mb-16">
            {t("categories.subtitle")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Wall Posters */}
            <div className="bg-card shadow-lg overflow-hidden">
              <div className="w-full overflow-hidden aspect-video">
                <Image
                  src="https://picsum.photos/seed/wall-poster/800/450"
                  alt="Wall Posters & Art Prints"
                  width={800}
                  height={450}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Frame className="w-6 h-6 text-primary flex-shrink-0" />
                  <h3 className="text-xl font-semibold">
                    {t("products.wallPosters.title")}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t("products.wallPosters.description")}
                </p>
              </div>
            </div>

            {/* Menu Backgrounds */}
            <div className="bg-card shadow-lg overflow-hidden">
              <div className="w-full overflow-hidden aspect-video">
                <Image
                  src="https://picsum.photos/seed/food-overhead/800/450"
                  alt="Menu Backgrounds & Templates"
                  width={800}
                  height={450}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <FileImage className="w-6 h-6 text-primary flex-shrink-0" />
                  <h3 className="text-xl font-semibold">
                    {t("products.menuBackgrounds.title")}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t("products.menuBackgrounds.description")}
                </p>
              </div>
            </div>

            {/* Table Cards */}
            <div className="bg-card shadow-lg overflow-hidden">
              <div className="w-full overflow-hidden aspect-video">
                <Image
                  src="https://picsum.photos/seed/table-setting/800/450"
                  alt="Table Cards & Tent Cards"
                  width={800}
                  height={450}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-6 h-6 text-primary flex-shrink-0" />
                  <h3 className="text-xl font-semibold">
                    {t("products.tableCards.title")}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t("products.tableCards.description")}
                </p>
              </div>
            </div>

            {/* Window Graphics */}
            <div className="bg-card shadow-lg overflow-hidden">
              <div className="w-full overflow-hidden aspect-video">
                <Image
                  src="https://picsum.photos/seed/storefront-glass/800/450"
                  alt="Window Graphics & Storefront Decals"
                  width={800}
                  height={450}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Store className="w-6 h-6 text-primary flex-shrink-0" />
                  <h3 className="text-xl font-semibold">
                    {t("products.windowGraphics.title")}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t("products.windowGraphics.description")}
                </p>
              </div>
            </div>

            {/* Staff Uniforms */}
            <div className="bg-card shadow-lg overflow-hidden">
              <div className="w-full overflow-hidden aspect-video">
                <Image
                  src="https://picsum.photos/seed/apron-kitchen/800/450"
                  alt="Staff Uniforms & Branded Apparel"
                  width={800}
                  height={450}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Shirt className="w-6 h-6 text-primary flex-shrink-0" />
                  <h3 className="text-xl font-semibold">
                    {t("products.uniforms.title")}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t("products.uniforms.description")}
                </p>
              </div>
            </div>

            {/* Packaging */}
            <div className="bg-card shadow-lg overflow-hidden">
              <div className="w-full overflow-hidden aspect-video">
                <Image
                  src="https://picsum.photos/seed/paper-packaging/800/450"
                  alt="Branded Packaging"
                  width={800}
                  height={450}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-6 h-6 text-primary flex-shrink-0" />
                  <h3 className="text-xl font-semibold">
                    {t("products.packaging.title")}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t("products.packaging.description")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" className="bg-muted py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            {t("howItWorks.title")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-8 text-center shadow-lg">
              <div className="flex justify-center mb-6">
                <ShoppingBag className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                {t("howItWorks.steps.choose.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("howItWorks.steps.choose.description")}
              </p>
            </div>

            <div className="bg-card p-8 text-center shadow-lg">
              <div className="flex justify-center mb-6">
                <ImagePlus className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                {t("howItWorks.steps.upload.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("howItWorks.steps.upload.description")}
              </p>
            </div>

            <div className="bg-card p-8 text-center shadow-lg">
              <div className="flex justify-center mb-6">
                <Truck className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                {t("howItWorks.steps.deliver.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("howItWorks.steps.deliver.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("cta.title")}
          </h2>

          <p className="text-foreground/80 mb-10 leading-relaxed">
            {t("cta.description")}
          </p>

          <Button
            size="lg"
            className="px-8 py-6 w-full md:w-auto hidden md:inline-flex"
            asChild
          >
            <Link href={routes.login}>{t("cta.primary")}</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6 text-center text-sm text-foreground/80">
          <Link href="/docs" className="hover:text-foreground transition-colors">
            {t("footer.about")}
          </Link>

          <a
            href="mailto:hello@menuyukti.com"
            className="hover:text-foreground transition-colors"
          >
            {t("footer.contact")}
          </a>

          <Link href="/docs" className="hover:text-foreground transition-colors">
            {t("footer.privacy")}
          </Link>

          <span className="text-foreground/60">{t("footer.copyright")}</span>
        </div>
      </footer>

      {/* Mobile Fixed CTA Bar */}
      <div className="fixed bottom-0 left-0 w-full backdrop-blur-md p-4 flex md:hidden gap-4 z-50">
        <Button className="w-full" size="lg" asChild>
          <Link href="#categories">{t("mobileCta.primary")}</Link>
        </Button>
        <Button className="w-full" size="lg" variant="outline">
          {t("mobileCta.secondary")}
        </Button>
      </div>
    </div>
  );
}
