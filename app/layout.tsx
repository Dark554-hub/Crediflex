import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { AppShellNav } from "@/components/mobile/app-shell-nav";
import { NavigationFeedback } from "@/components/mobile/navigation-feedback";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crediflex",
  description: "Sistema de gestion de creditos y cobranza en campo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0E3B2E",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-field antialiased lg:pl-20">
        <NavigationFeedback />
        {children}
        <AppShellNav />
      </body>
    </html>
  );
}
