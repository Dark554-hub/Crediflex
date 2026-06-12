import { Download, FileSpreadsheet } from "lucide-react";
import { AppBar } from "@/components/mobile/app-bar";
import { todayInputValueInMexico } from "@/lib/dates";

const reports = [
  {
    title: "Cartera completa",
    detail: "Clientes, prestamos, pagos realizados, pagos vencidos, pagado y saldo.",
    href: "/reportes/exportar?tipo=cartera",
  },
  {
    title: "Reporte de mora",
    detail: "Clientes con cuotas vencidas, dias de atraso y monto pendiente.",
    href: "/reportes/exportar?tipo=mora",
  },
  {
    title: "Resumen de ganancias",
    detail: "Capital, intereses generados, intereses cobrados y saldos.",
    href: "/reportes/exportar?tipo=ganancias",
  },
];

export default function ReportsPage() {
  const today = todayInputValueInMexico();

  return (
    <main className="min-h-screen bg-field pb-8">
      <AppBar title="Reportes" />

      <section className="mx-auto max-w-3xl px-4 py-5">
        <div className="rounded-md bg-ink p-4 text-white shadow-soft">
          <FileSpreadsheet size={34} className="text-maize" aria-hidden />
          <h1 className="mt-3 text-2xl font-extrabold">Exportacion a Excel</h1>
          <p className="mt-2 text-sm leading-6 text-white/75">
            Descarga la informacion operativa en archivos compatibles con Microsoft Excel.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-3xl gap-3 px-4">
        {reports.map((report) => (
          <a
            key={report.href}
            href={report.href}
            className="rounded-md border border-line bg-white p-4 shadow-soft transition hover:border-maize"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-ink">{report.title}</h2>
                <p className="mt-1 text-sm leading-6 text-stone-700">{report.detail}</p>
              </div>
              <Download className="shrink-0 text-moss" size={22} aria-hidden />
            </div>
          </a>
        ))}
      </section>

      <section className="mx-auto mt-4 max-w-3xl px-4">
        <form
          action="/reportes/exportar"
          className="rounded-md border border-line bg-white p-4 shadow-soft"
        >
          <input type="hidden" name="tipo" value="pagos" />
          <h2 className="text-lg font-extrabold text-ink">Historial de pagos por fecha</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">Desde</span>
              <input
                name="desde"
                type="date"
                defaultValue={today}
                className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">Hasta</span>
              <input
                name="hasta"
                type="date"
                defaultValue={today}
                className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
              />
            </label>
          </div>
          <button className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white shadow-soft transition hover:bg-moss sm:w-auto">
            <Download size={18} aria-hidden />
            Descargar pagos
          </button>
        </form>
      </section>
    </main>
  );
}
