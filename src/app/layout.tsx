import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/hooks/useWallet";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NexTo - Next Generation Tokenized Real Estate Platform",
  description: "Next generation tokenized real estate platform on Flare Network with transparent property acquisition and NFT shares.",
  keywords: ["blockchain", "real estate", "nexto", "flare", "nft", "defi"],
  authors: [{ name: "NexTo Platform" }],
  openGraph: {
    title: "NexTo - Next Generation Tokenized Real Estate Platform",
    description: "Next generation tokenized real estate platform on Flare Network",
    type: "website",
    siteName: "NexTo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
