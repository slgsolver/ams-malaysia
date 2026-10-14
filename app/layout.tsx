import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "AMS Malaysia — Accounting, Receipts & LHDN Tax Records";
const description = "Malaysian receipt capture, MPERS double-entry accounts, P&L, Balance Sheet, Cash Flow, Borang BE, Borang B and Borang C preparation.";
const socialImage = {
  url: "/og-ams.png",
  width: 1200,
  height: 630,
  alt: "AMS Malaysia receipt, financial statement and tax records interface",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ams-malaysia.vercel.app"),
  applicationName: "AMS Malaysia",
  title,
  description,
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/ams-icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/ams-icon.svg",
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AMS Malaysia",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/",
    siteName: "AMS Malaysia",
    locale: "en_MY",
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
};

export const viewport = {
  themeColor: "#2c85c8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-MY">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
