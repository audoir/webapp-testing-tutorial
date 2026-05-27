import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { CartProvider } from "@/context/CartContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShopNext — Online Store",
  description: "A simple online store built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-900 text-slate-100">
        <CartProvider>
          <Navbar />
          <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
            {children}
          </main>
        </CartProvider>
        <footer className="bg-slate-800 border-t border-slate-700 py-4 text-center text-sm text-slate-400">
          © 2025 ShopNext. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
