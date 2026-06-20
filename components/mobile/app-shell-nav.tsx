"use client";

import {
  BarChart3,
  CalendarDays,
  Home,
  Landmark,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/cobros", label: "Cobros", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/creditos", label: "Creditos", icon: Landmark },
  { href: "/finanzas", label: "Finanzas", icon: WalletCards },
] as const;

const desktopItems = [
  ...navItems,
  { href: "/estadisticas", label: "Datos", icon: BarChart3 },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShellNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/acceso")) {
    return null;
  }

  return (
    <>
      <nav
        className="fixed inset-x-3 bottom-3 z-40 rounded-md border border-line bg-white/96 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-lift backdrop-blur lg:hidden"
        aria-label="Navegacion principal"
      >
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-extrabold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/30 ${
                  active
                    ? "bg-ink text-white"
                    : "text-stone-700 hover:bg-field active:bg-mint/70"
                }`}
              >
                <Icon size={20} strokeWidth={2.35} aria-hidden />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <nav
        className="fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 rounded-md border border-line bg-white/95 p-2 shadow-lift backdrop-blur lg:block"
        aria-label="Navegacion principal"
      >
        <div className="grid gap-1">
          {desktopItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex h-12 w-12 items-center justify-center rounded-md transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/30 ${
                  active
                    ? "bg-ink text-white"
                    : "text-stone-700 hover:bg-field hover:text-ink"
                }`}
              >
                <Icon size={21} strokeWidth={2.35} aria-hidden />
                <span className="pointer-events-none absolute left-[3.35rem] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-extrabold text-white shadow-soft group-hover:block">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
