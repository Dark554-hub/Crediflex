import { Cloud, Database } from "lucide-react";
import { AppBar } from "@/components/mobile/app-bar";

export default function SyncPage() {
  return (
    <main className="min-h-screen bg-field">
      <AppBar title="Sincronizacion" />
      <section className="mx-auto max-w-3xl px-4 py-5">
        <div className="rounded-md border border-line bg-white p-5 shadow-sm">
          <Cloud className="text-moss" size={42} aria-hidden />
          <h2 className="mt-3 text-2xl font-black text-ink">Datos en la nube</h2>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            La aplicacion guarda clientes, prestamos y pagos directamente en Supabase.
          </p>
          <div className="mt-5 flex items-center gap-3 rounded-md bg-field p-4 text-sm font-semibold text-moss">
            <Database size={20} aria-hidden />
            Conexion activa con base de datos
          </div>
        </div>
      </section>
    </main>
  );
}
