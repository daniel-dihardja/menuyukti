import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";
import { AppChrome } from "@/components/app-chrome";
import { Providers } from "@/components/providers";
import { routes } from "@/lib/routes";
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
  title: "Menuyukti - Kurangi Keborosan & Limbah Makanan",
  description:
    "Analisis cerdas berbasis data untuk mengurangi keborosan dan limbah makanan yang menurunkan profit.",
  openGraph: {
    title: "Menuyukti - Kurangi Keborosan & Limbah Makanan",
    description:
      "Analisis cerdas berbasis data untuk mengurangi keborosan dan limbah makanan yang menurunkan profit.",
    url: "https://menuyukti.com",
    siteName: "Menuyukti",
    images: [
      {
        url: "https://menuyukti.com/images/og-image.webp",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "Menuyukti - Kurangi Keborosan & Limbah Makanan",
    description:
      "Analisis cerdas berbasis data untuk mengurangi keborosan dan limbah makanan yang menurunkan profit.",
    images: ["https://menuyukti.com/images/og-image.webp"],
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
        <ClerkProvider signInUrl={routes.login} signUpUrl={routes.signUp}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers>
              <AppChrome>{children}</AppChrome>
            </Providers>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
