import { ArrowLeft, MoreVertical } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

import { SyncBadge } from "@/components/mobile/sync-badge";

type AppBarProps = {
  title: string;
  backHref?: string;
  action?: ReactNode;
};

export function AppBar({ title, backHref = "/", action }: AppBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-ink text-white shadow-soft">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Regresar"
            className="-ml-2 inline-flex h-12 w-12 items-center justify-center rounded-md transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/30"
          >
            <ArrowLeft size={26} aria-hidden />
          </Link>
        ) : null}
        <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold tracking-normal sm:text-2xl">{title}</h1>
        <div className="flex items-center gap-2">
          <SyncBadge />
          {action}
        </div>
      </div>
    </header>
  );
}
