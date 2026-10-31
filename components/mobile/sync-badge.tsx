"use client";

import { CheckCircle2, Cloud } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function SyncBadge() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <Link
      href="/sincronizacion"
      title={online ? "Sincronizado con la nube (Supabase)" : "Sin conexión a internet"}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white/90 transition hover:bg-white/20 active:scale-95"
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
            online ? "bg-mint" : "bg-red-400"
          }`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            online ? "bg-mint" : "bg-red-500"
          }`}
        />
      </span>
      <span className="hidden sm:inline font-semibold">
        {online ? "Sincronizado" : "Desconectado"}
      </span>
    </Link>
  );
}
