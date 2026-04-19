import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, IBM_Plex_Mono } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BasketProviderWrapper } from "@/components/basket-provider-wrapper";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5B9434",
};

export const metadata: Metadata = {
  title: "BasketWise - Australian Grocery Price Comparison",
  description:
    "Compare prices across Coles, Woolworths and Aldi. Build a basket, optimise your shop, and see if specials are actually savings.",
  metadataBase: new URL("https://basketwise.com.au"),
  manifest: "/manifest.json",
  openGraph: {
    title: "BasketWise - Australian Grocery Price Comparison",
    description:
      "Compare prices across Coles, Woolworths and Aldi. Build a basket, optimise your shop, and see if specials are actually savings.",
    url: "https://basketwise.com.au",
    siteName: "BasketWise",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "BasketWise - Australian Grocery Price Comparison",
    description:
      "Compare prices across Coles, Woolworths and Aldi. Build a basket, optimise your shop, and see if specials are actually savings.",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BasketWise",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <link rel="icon" href="/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className={inter.className}>
        <BasketProviderWrapper>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </BasketProviderWrapper>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
