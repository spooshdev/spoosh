import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Provider } from "@/components/provider";
import "./global.css";

const inter = Inter({
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://spoosh.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Spoosh - Type-Safe API Client",
    template: "%s | Spoosh",
  },
  description:
    "A type-safe API client with a powerful plugin system. Features caching, invalidation, retry, polling, and more.",
  keywords: [
    "spoosh",
    "api client",
    "typescript",
    "type-safe",
    "fetch",
    "data fetching",
    "caching",
    "react",
    "next.js",
  ],
  authors: [{ name: "Spoosh Team" }],
  creator: "Spoosh",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Spoosh",
    title: "Spoosh - Type-Safe API Client",
    description:
      "A type-safe API client with a powerful plugin system. Features caching, invalidation, retry, polling, and more.",
    images: [
      {
        url: "/og/home",
        width: 1200,
        height: 630,
        alt: "Spoosh - Type-Safe API Client",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spoosh - Type-Safe API Client",
    description: "A type-safe API client with a powerful plugin system.",
    images: ["/og/home"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
