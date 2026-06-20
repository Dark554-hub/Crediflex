import type { Metadata } from "next";
import { ReactNode } from "react";
import { AppShellNav } from "@/components/mobile/app-shell-nav";
import { NavigationFeedback } from "@/components/mobile/navigation-feedback";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crediflex",
  description: "Sistema de gestion de creditos y cobranza en campo.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <NavigationFeedback />
        {children}
        <AppShellNav />
      </body>
    </html>
  );
}
