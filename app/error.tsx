'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-field px-4 py-8 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-lift text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-black text-ink">Ocurrió un problema temporal</h1>
        <p className="mt-2 text-sm text-stone-600">
          La base de datos o el servicio tardó en responder. Puedes reintentar cargar la información.
        </p>

        {error.digest && (
          <p className="mt-2 text-[11px] font-mono text-stone-400">
            Código: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => reset()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-moss active:scale-98"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-field px-4 py-2 text-xs font-bold text-ink transition hover:bg-stone-200"
          >
            <Home className="h-3.5 w-3.5" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
