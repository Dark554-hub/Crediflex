import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-field px-6 text-ink">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="animate-spin text-moss" size={34} aria-hidden />
        <p className="text-sm font-bold">Cargando...</p>
      </div>
    </main>
  );
}
