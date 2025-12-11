

import CookieBanner from "@/components/custom/CookieBanner";
import Footer from "@/components/custom/Footer";
import Header from "@/components/custom/Header";
import AgeVerificationModal from "@/components/custom/modals/AgeVerificationModal";
import { archivoBlack, poppins } from "@/lib/fonts";
import { ReactQueryProvider } from "@/lib/providers/react-query-provider";
import type { Metadata } from "next";
import "../styles/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goodseed - Plant Seed Marketplace",
  description: "Discover and compare the best cannabis seeds from top seed banks worldwide. Find your perfect strain at the best price with Goodseed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${archivoBlack.variable} antialiased`}
      >
        <ReactQueryProvider>
          <AgeVerificationModal />
          <CookieBanner />
          <Header />
          {children}
          <Footer />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
