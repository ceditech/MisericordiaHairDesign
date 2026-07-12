import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ThemeProvider, themeScript } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Misericordia Hair Designs | Professional African American Braiding Services",
  description:
    "Expert African American braiding services in New York. Specializing in knotless braids, box braids, and protective styles. Book your appointment today!",
};

import { CartProvider } from "@/src/lib/shop/cartStore";
import { AuthProvider } from "@/src/providers/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <script
          id="theme-script"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className={`${plusJakartaSans.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
                <Header />
                <main>{children}</main>
                <Footer />
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
