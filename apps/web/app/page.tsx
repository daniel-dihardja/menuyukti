import Image from "next/image";
import { Button } from "@workspace/ui/components/button";
import {
  Upload,
  BarChart3,
  Lightbulb,
  TrendingUp,
  Leaf,
  Sparkles,
  PieChart,
  UtensilsCrossed,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="w-full sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo + Name */}
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">Menuyukti</h1>
          </div>

          {/* Right Buttons */}
          <div className="flex items-center gap-4">
            <Button variant="ghost">Sign in</Button>
            <Button variant="default">Sign up</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero-03.png"
            alt="Menuyukti Hero"
            fill
            priority
            className="object-cover"
          />
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-background/50" />
        </div>

        {/* Hero Content */}
        <div className="relative max-w-6xl mx-auto px-6 py-32">
          <h2 className="text-4xl md:text-6xl font-bold leading-tight max-w-3xl space-y-2 text-shadow-lg">
            Optimalkan Menu Anda.
            <br />
            Kurangi Limbah.
            <br />
            Tingkatkan Keuntungan.
          </h2>

          <div className="mt-8 flex gap-4">
            <Button size="lg" variant="default">
              Mulai Sekarang
            </Button>

            <Button size="lg" variant="outline">
              Pelajari Lebih Lanjut
            </Button>
          </div>
        </div>
      </section>

      {/* Section 2 — Image Left, Text Right */}
      <section className="bg-background">
        <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Image */}
          <div className="w-full h-full overflow-hidden shadow-lg">
            <Image
              src="/images/hero.png"
              alt="MenuYukti section image"
              width={800}
              height={600}
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Right: Text */}
          <div>
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/90">
              MenuYukti membantu pemilik restoran mengetahui hidangan mana yang
              benar-benar menguntungkan — dan mana yang diam-diam mengurangi
              profit Anda.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 — Text Left, Image Right (mobile image first) */}
      <section className="bg-background">
        <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Image — first on mobile, second on desktop */}
          <div className="order-1 md:order-2 w-full h-full overflow-hidden shadow-lg">
            <Image
              src="/images/hero-03.png"
              alt="MenuYukti section image"
              width={800}
              height={600}
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Text — second on mobile, first on desktop */}
          <div className="order-2 md:order-1">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/90">
              Menu yang terlalu besar sering menyebabkan pemborosan bahan, waktu
              persiapan yang lama, dan penurunan keuntungan. Tanpa data yang
              jelas, sulit mengetahui mana hidangan yang benar-benar laku.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4 — Steps */}
      <section className="bg-background py-24">
        <div className="max-w-6xl mx-auto px-6">
          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground">
            Bagaimana Cara Kerjanya?
          </h2>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-card  p-8 text-center border border-border shadow-lg">
              <div className="flex justify-center mb-6">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-card-foreground">
                1. Unggah Data
              </h3>
              <p className="text-muted-foreground">
                Unggah data penjualan Anda (CSV atau ekspor POS).
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-card  p-8 text-center border border-border shadow-lg">
              <div className="flex justify-center mb-6">
                <BarChart3 className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-card-foreground">
                2. Analisis Otomatis
              </h3>
              <p className="text-muted-foreground">
                MenuYukti menganalisis setiap hidangan dengan teknik menu
                engineering.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-card  p-8 text-center border border-border shadow-lg">
              <div className="flex justify-center mb-6">
                <Lightbulb className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-card-foreground">
                3. Laporan & Aksi
              </h3>
              <p className="text-muted-foreground">
                Dapatkan laporan visual yang jelas: hidangan mana yang
                dipertahankan atau dihapus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 — Why Choose MenuYukti */}
      <section className="bg-background py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-foreground">
            Mengapa Restoran Memilih MenuYukti
          </h2>

          <p className="text-center text-foreground/80 max-w-3xl mx-auto mb-16">
            Kami menyediakan alat berbasis data yang membantu Anda membuat
            keputusan menu yang lebih cerdas, menguntungkan, dan efisien.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-card p-6 border border-border shadow-lg text-center">
              <TrendingUp className="w-10 h-10 text-primary mx-auto mb-4" />
              <p className="text-card-foreground font-semibold text-lg">
                Tingkatkan margin keuntungan
              </p>
            </div>

            <div className="bg-card p-6 border border-border shadow-lg text-center">
              <Leaf className="w-10 h-10 text-primary mx-auto mb-4" />
              <p className="text-card-foreground font-semibold text-lg">
                Kurangi limbah makanan
              </p>
            </div>

            <div className="bg-card p-6 border border-border shadow-lg text-center">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
              <p className="text-card-foreground font-semibold text-lg">
                Operasional dapur lebih efisien
              </p>
            </div>

            <div className="bg-card p-6 border border-border shadow-lg text-center">
              <PieChart className="w-10 h-10 text-primary mx-auto mb-4" />
              <p className="text-card-foreground font-semibold text-lg">
                Wawasan berbasis data tanpa rumit
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-background py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          {/* Headline */}
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Siap Meningkatkan Profitabilitas Restoran Anda?
          </h2>

          {/* Subtitle */}
          <p className="text-foreground/80 mb-10 leading-relaxed">
            Ambil kendali atas menu dan keuntungan Anda. Dapatkan analisis
            gratis tanpa kewajiban hari ini dan lihat potensi tersembunyi dalam
            data Anda.
          </p>

          {/* CTA Button */}
          <Button size="lg" className="px-8 py-6">
            Dapatkan Analisis Gratis Anda
          </Button>
        </div>
      </section>

      <footer className="bg-background border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Menuyukti</span>
          </div>

          {/* Center Navigation */}
          <nav className="flex items-center gap-8 text-foreground/80 text-sm">
            <a href="#" className="hover:text-foreground transition-colors">
              Tentang Kami
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Kontak
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Kebijakan Privasi
            </a>
          </nav>

          {/* Right: Copyright */}
          <p className="text-foreground/60 text-sm text-center md:text-right">
            © 2025 Menuyukti. Hak cipta dilindungi.
          </p>
        </div>
      </footer>
    </div>
  );
}
