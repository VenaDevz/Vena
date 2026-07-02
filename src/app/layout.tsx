import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { headers } from "next/headers";
import Web3Provider from "@/context/Web3Provider";
import "./globals.css";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "VENA — Mint. Upgrade. Stake & Earn.",
  description:
    "$VENA on Robinhood Chain via Virtuals Protocol. Mint a Silver Pickaxe, upgrade by burning lower tiers, and stake to earn from a 250M VENA mining pool.",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "VENA — Mining Protocol on Robinhood Chain",
    description:
      "$VENA agent token on Virtuals Protocol (Robinhood Chain). Mint, upgrade, and stake Pickaxes for VENA rewards.",
    images: [{ url: "/banner.jpg", width: 1500, height: 500, alt: "VENA" }],
    siteName: "VENA",
  },
  twitter: {
    card: "summary_large_image",
    title: "VENA — Mining Protocol on Robinhood Chain",
    description: "Mint. Upgrade. Stake & earn. Robinhood Chain · Virtuals Protocol.",
    images: ["/banner.jpg"],
    creator: "@VenaOnBase",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cookies = headersList.get("cookie");

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#030609] text-slate-200">
        <Web3Provider cookies={cookies}>{children}</Web3Provider>
      </body>
    </html>
  );
}
