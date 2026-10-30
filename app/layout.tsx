import type { Metadata } from "next";
import localFont from "next/font/local";
import { t } from "@/lib/i18n";
import "./globals.css";

const publicSans = localFont({
  src: [
    { path: "./fonts/PublicSans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/PublicSans-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-public-sans",
  display: "swap",
});

const newsreader = localFont({
  src: [
    { path: "./fonts/Newsreader-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Newsreader-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: t("meta.title"),
  description: t("meta.description"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-US"
      className={`${publicSans.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
