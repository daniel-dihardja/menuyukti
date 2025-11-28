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
    <div className="min-h-screen bg-background text-foreground relative pb-24 md:pb-0">
      {/* Header */}
      <header className="w-full sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo + Name */}
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">Menuyukti</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full min-h-[calc(100vh-4rem)] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero.webp"
            alt="Menuyukti Hero"
            fill
            priority
            className="object-cover object-[50%_75%]"
          />
          <div className="absolute inset-0 bg-background/50" />
        </div>

        {/* Hero Content */}
        <div className="relative max-w-6xl mx-auto px-6">
          <h2 className="text-4xl md:text-6xl font-bold leading-tight max-w-3xl px-3 py-2 text-shadow-lg">
            Optimalkan Menu Anda.
            <br />
            Kurangi Limbah.
            <br />
            Tingkatkan Keuntungan.
          </h2>

          {/* DESKTOP CTA Buttons */}
          <div className="mt-8 hidden md:flex gap-4">
            <Button size="lg" variant="default">
              Mulai Sekarang
            </Button>
          </div>
        </div>
      </section>

      {/* Section 2 — Image Left, Text Right */}
      <section className="bg-background">
        <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="w-full h-full overflow-hidden shadow-lg">
            <Image
              src="/images/analisis-05.webp"
              alt="MenuYukti section image"
              width={1024}
              height={768}
              className="mx-auto"
            />
          </div>

          <div>
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/90">
              Menuyukti membantu pemilik restoran mengidentifikasi{" "}
              <strong>hidangan beban</strong> dan{" "}
              <strong>bintang profit</strong> Anda. Dapatkan data akurat untuk
              segera <strong>mengoptimalkan atau menghapus</strong> menu yang
              diam-diam mengurangi profit Anda.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 — Text Left, Image Right */}
      <section className="bg-background">
        <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="order-1 md:order-2 w-full h-full overflow-hidden shadow-lg">
            <Image
              src="/images/analisis-06.webp"
              alt="Menuyukti section image"
              width={1024}
              height={768}
            />
          </div>

          <div className="order-2 md:order-1">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/90">
              Menu yang terlalu besar menyebabkan{" "}
              <strong>pemborosan bahan</strong> dan{" "}
              <strong>waktu persiapan yang lama</strong>. Masalah utamanya:
              Tanpa data yang jelas, Anda sulit mengidentifikasi dan{" "}
              <strong>menghapus hidangan &quot;beban&quot;</strong> yang
              diam-diam mengerogoti efisiensi dan margin keuntungan Anda.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4 — Steps */}
      <section className="bg-background py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Bagaimana Cara Kerjanya?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-8 text-center shadow-lg">
              <div className="flex justify-center mb-6">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Upload Data</h3>
              <p className="text-muted-foreground">
                Upload data penjualan Anda (Excel ekspor dari POS).
              </p>
            </div>

            <div className="bg-card p-8 text-center shadow-lg">
              <div className="flex justify-center mb-6">
                <BarChart3 className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                2. Analisis Otomatis
              </h3>
              <p className="text-muted-foreground">
                Menuyukti menganalisis setiap hidangan dengan teknik menu
                engineering.
              </p>
            </div>

            <div className="bg-card p-8 text-center shadow-lg">
              <div className="flex justify-center mb-6">
                <Lightbulb className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Laporan & Aksi</h3>
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
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
            Mengapa Restoran Memilih Menuyukti
          </h2>

          <p className="text-center text-foreground/80 max-w-3xl mx-auto mb-16">
            Kami menyediakan alat berbasis data yang membantu Anda membuat
            keputusan menu yang lebih cerdas, menguntungkan, dan efisien.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-card p-6 shadow-lg text-center">
              <PieChart className="w-10 h-10 text-primary mx-auto mb-4" />
              <p className="font-semibold text-lg">Wawasan berbasis data</p>
            </div>

            <div className="bg-card p-6 shadow-lg text-center">
              <Leaf className="w-10 h-10 text-primary mx-auto mb-4" />
              <p className="font-semibold text-lg">Kurangi limbah makanan</p>
            </div>

            <div className="bg-card p-6 shadow-lg text-center">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
              <p className="font-semibold text-lg">
                Operasional dapur lebih efisien
              </p>
            </div>

            <div className="bg-card p-6 shadow-lg text-center">
              <TrendingUp className="w-10 h-10 text-primary mx-auto mb-4" />
              <p className="font-semibold text-lg">
                Tingkatkan margin keuntungan
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-background py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Siap Mengurangi Pemborosan di Restoran Anda?
          </h2>

          <p className="text-foreground/80 mb-10 leading-relaxed">
            Dapatkan analisis gratis tanpa kewajiban hari ini dan lihat potensi
            tersembunyi dalam data Anda.
          </p>

          {/* Desktop button (mobile replaced by sticky CTA) */}
          <Button
            size="lg"
            className="px-8 py-6 w-full md:w-auto hidden md:inline-flex"
          >
            Mulai Sekarang
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6 text-center text-sm text-foreground/80">
          <a href="#" className="hover:text-foreground transition-colors">
            Tentang Kami
          </a>

          <a href="#" className="hover:text-foreground transition-colors">
            Kontak
          </a>

          <a href="#" className="hover:text-foreground transition-colors">
            Kebijakan Privasi
          </a>

          <span className="text-foreground/60">© 2025 Menuyukti</span>
        </div>
      </footer>

      {/* 
      =========================================================
      STICKY MOBILE CTA (shown only on mobile)
      =========================================================
      */}
      <div className="fixed bottom-0 left-0 w-full bg-background/90 backdrop-blur-md p-4 flex md:hidden gap-4 border-t border-border z-50">
        <Button className="w-full" size="lg">
          Mulai Sekarang
        </Button>
        <Button className="w-full" size="lg" variant="outline">
          Pelajari Lebih Lanjut
        </Button>
      </div>
    </div>
  );
}
