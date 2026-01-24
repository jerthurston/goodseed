
import CookieBanner from "@/components/custom/CookieBanner";
import Footer from "@/components/custom/footer";
import Header from "@/components/custom/header";
import AgeVerificationModal from "@/components/custom/modals/AgeVerificationModal";
import DemoPasswordModal from "@/components/custom/modals/DemoPasswordModal";
import { archivoBlack, poppins } from "@/lib/fonts";
import { ReactQueryProvider } from "@/lib/providers/react-query-provider";
import type { Metadata } from "next";
import "../styles/styles.css";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";

// FontAwesome configuration for Next.js
import '@fortawesome/fontawesome-svg-core/styles.css';
import { config } from '@fortawesome/fontawesome-svg-core';
import NotificationPreferences from "@/components/custom/modals/NotificationPreferences";
config.autoAddCss = true; // Prevent FA from auto-adding CSS (Next.js handles it)

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
        <SessionProvider>
          <ReactQueryProvider>
            {/* Demo Password Protection - Must be first */}
            <DemoPasswordModal />
            <AgeVerificationModal />
            <CookieBanner />
            {/* --> Authentication first time and showing notification preferences */}
            <NotificationPreferences />
            {/* <div className="header-wrapper relative"> */}
            <Header />
            {/* </div> */}
            {children}
            {/* <div className="footer-wrapper"> */}
            <Footer />
            {/* </div> */}
            <Toaster />
          </ReactQueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
