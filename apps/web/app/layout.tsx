import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Menuyukti - Optimalkan Menu, Kurangi Limbah",
  description:
    "Menuyukti membantu restoran meningkatkan profit melalui analisis menu berbasis data.",
  openGraph: {
    title: "Menuyukti - Optimalkan Menu Anda dengan Analisis Cerdas",
    description:
      "Menuyukti membantu pemilik restoran mengetahui hidangan mana yang benar-benar menguntungkan.",
    url: "https://menuyukti.com",
    siteName: "Menuyukti",
    images: [
      {
        url: "https://menuyukti.com/images/og-image.webpp",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "Menuyukti – Analisis Menu Cerdas",
    description: "Optimalkan menu restoran Anda dengan AI dan analisis data.",
    images: ["https://menuyukti.com/images/og-image.webpp"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
