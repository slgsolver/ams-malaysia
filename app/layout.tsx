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

export const metadata: Metadata = {
  metadataBase: new URL("https://ams-malaysia.vercel.app"),
  title,
  description,
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title, description, type: "website", locale: "en_MY", images: [{ url: "/og-v6.png", width: 1732, height: 908, alt: "AMS Malaysia accounting and LHDN preparation for individuals and Sdn. Bhd. companies" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og-v6.png"] },
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
