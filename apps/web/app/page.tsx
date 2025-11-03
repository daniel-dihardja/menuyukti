import { Button } from "@workspace/ui/components/button";

export default function Page() {
  return (
    <main className="flex flex-col items-center justify-center w-full text-gray-800">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center min-h-svh text-center px-6 py-20 bg-gradient-to-b from-white to-green-50">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Optimalkan Menu Anda. Kurangi Limbah. Tingkatkan Keuntungan.
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-8">
          MenuYukti membantu pemilik restoran mengetahui hidangan mana yang
          benar-benar menguntungkan — dan mana yang diam-diam mengurangi profit
          Anda.
        </p>
        <Button size="lg" className="px-8 py-6 text-lg">
          Analisis Menu Saya
        </Button>
        <p className="text-sm text-gray-500 mt-4">
          Tanpa instalasi — cukup gunakan data penjualan yang sudah Anda miliki.
        </p>
      </section>

      {/* Problem Section */}
      <section className="w-full max-w-5xl px-6 py-20">
        <h2 className="text-3xl font-semibold text-center mb-6">
          Terlalu Banyak Menu? Biaya Tersembunyi?
        </h2>
        <p className="text-center text-gray-600 max-w-3xl mx-auto mb-10">
          Menu yang terlalu besar sering menyebabkan pemborosan bahan, waktu
          persiapan yang lama, dan penurunan keuntungan. Tanpa data yang jelas,
          sulit mengetahui mana hidangan yang benar-benar laku.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 border rounded-2xl shadow-sm bg-white text-center">
            <h3 className="font-semibold mb-2">❌ Masalah</h3>
            <p className="text-gray-600">
              Terlalu banyak pilihan menu, penjualan tidak konsisten, dan stok
              berlebih — semua ini menambah biaya operasional tanpa disadari.
            </p>
          </div>
          <div className="p-6 border rounded-2xl shadow-sm bg-white text-center">
            <h3 className="font-semibold mb-2">✅ Solusi</h3>
            <p className="text-gray-600">
              MenuYukti menunjukkan hidangan yang paling menguntungkan dan mana
              yang sebaiknya dihapus — membantu Anda mengurangi limbah sekaligus
              menjaga kepuasan pelanggan.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full bg-green-50 py-20 px-6">
        <h2 className="text-3xl font-semibold text-center mb-10">
          Cara Kerjanya
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              step: "1",
              text: "Unggah data penjualan Anda (CSV atau ekspor POS)",
            },
            {
              step: "2",
              text: "MenuYukti menganalisis setiap hidangan dengan teknik menu engineering",
            },
            {
              step: "3",
              text: "Dapatkan laporan visual yang jelas: hidangan mana yang dipertahankan atau dihapus",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-green-100 text-green-700 font-bold rounded-full mb-4">
                {item.step}
              </div>
              <p className="text-gray-700">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="w-full max-w-5xl px-6 py-20">
        <h2 className="text-3xl font-semibold text-center mb-10">
          Mengapa Restoran Memilih MenuYukti
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: "💰", text: "Tingkatkan margin keuntungan" },
            { icon: "🍽️", text: "Kurangi limbah makanan" },
            { icon: "⚡", text: "Operasional dapur lebih efisien" },
            { icon: "📊", text: "Wawasan berbasis data tanpa rumit" },
          ].map((b) => (
            <div
              key={b.text}
              className="p-6 bg-white border rounded-2xl shadow-sm"
            >
              <div className="text-3xl mb-2">{b.icon}</div>
              <p className="font-medium">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full bg-green-600 text-white text-center py-20 px-6">
        <h2 className="text-4xl font-bold mb-6">
          Pangkas Menu Anda. Kurangi Limbah. Naikkan Keuntungan.
        </h2>
        <p className="text-lg mb-8">
          Dapatkan wawasan yang bisa ditindaklanjuti dari data penjualan Anda —
          hanya dalam hitungan menit.
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="bg-white text-green-700 hover:bg-gray-100 px-8 py-6 text-lg"
        >
          Analisis Menu Saya Sekarang
        </Button>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-500">
        © {new Date().getFullYear()} MenuYukti. Hak cipta dilindungi.
      </footer>
    </main>
  );
}
