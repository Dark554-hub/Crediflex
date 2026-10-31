import { FileSpreadsheet, Filter, Trash2, WalletCards } from "lucide-react";
import Link from "next/link";
import { createExpenseAction, deleteExpenseAction, saveInitialCapitalAction } from "@/app/finanzas/actions";
import { AppBar } from "@/components/mobile/app-bar";
import { todayInputValueInMexico } from "@/lib/dates";
import { getFinanceSummary } from "@/lib/finances";
import { formatDate } from "@/lib/format";
import { formatCurrency } from "@/lib/money";

export const dynamic = "force-dynamic";

type FinancesPageProps = {
  searchParams?: {
    desde?: string;
    hasta?: string;
  };
};

function parseParamDate(val?: string) {
  if (!val) return undefined;
  const d = new Date(`${val}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function FinancesPage({ searchParams }: FinancesPageProps) {
  const today = todayInputValueInMexico();
  
  // Rango por defecto: primer día del mes actual hasta hoy
  const [yearStr, monthStr] = today.split("-");
  const firstDayOfMonth = `${yearStr}-${monthStr}-01`;
  
  const fromStr = searchParams?.desde || firstDayOfMonth;
  const toStr = searchParams?.hasta || today;

  const fromDate = parseParamDate(fromStr);
  const toDate = parseParamDate(toStr);

  const summary = await getFinanceSummary({
    from: fromDate,
    to: toDate,
  });

  // Totales del período filtrado
  const totalInitial = summary.rows.reduce((sum, r) => sum + r.initialCapital, 0);
  const totalLoans = summary.rows.reduce((sum, r) => sum + r.loans, 0);
  const totalOrdinary = summary.rows.reduce((sum, r) => sum + r.ordinaryCollected, 0);
  const totalLateFee = summary.rows.reduce((sum, r) => sum + r.lateFeeCollected, 0);
  const totalExpenses = summary.rows.reduce((sum, r) => sum + r.expenses, 0);
  const netCollected = totalOrdinary + totalLateFee;

  return (
    <main className="min-h-screen bg-field pb-12">
      <AppBar title="Finanzas" />

      {/* Hero y resumen */}
      <section className="mx-auto max-w-5xl px-4 py-5">
        <div className="rounded-xl bg-ink p-5 text-white shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <WalletCards size={30} className="text-maize" aria-hidden />
                <h1 className="text-2xl font-black">Historial y Finanzas</h1>
              </div>
              <p className="mt-1 text-sm text-white/75">
                Flujo de caja, préstamos, cobros, moras y gastos por rango de fechas.
              </p>
            </div>

            {/* Botón para descargar Excel del período filtrado */}
            <a
              href={`/reportes/exportar?tipo=pagos&desde=${fromStr}&hasta=${toStr}`}
              download
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-maize px-4 py-2.5 text-sm font-extrabold text-ink transition hover:bg-white active:scale-95 shadow-soft"
            >
              <FileSpreadsheet size={18} aria-hidden />
              Exportar Excel del mes
            </a>
          </div>

          {/* Tarjetas de métricas del período */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 border-t border-white/15 pt-4">
            <div className="rounded-lg bg-white/10 p-3">
              <span className="text-xs font-semibold text-white/70 block">Préstamos dados</span>
              <span className="text-lg font-black text-white mt-0.5 block">{formatCurrency(totalLoans)}</span>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <span className="text-xs font-semibold text-white/70 block">Cobranza total</span>
              <span className="text-lg font-black text-mint mt-0.5 block">{formatCurrency(netCollected)}</span>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <span className="text-xs font-semibold text-white/70 block">Mora cobrada</span>
              <span className="text-lg font-black text-maize mt-0.5 block">{formatCurrency(totalLateFee)}</span>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <span className="text-xs font-semibold text-white/70 block">Gastos totales</span>
              <span className="text-lg font-black text-red-300 mt-0.5 block">{formatCurrency(totalExpenses)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filtro de rango de fechas en pantalla */}
      <section className="mx-auto max-w-5xl px-4">
        <form
          action="/finanzas"
          method="GET"
          className="rounded-xl border border-line bg-white p-4 shadow-soft"
        >
          <div className="flex items-center gap-2 mb-3 text-ink font-extrabold text-sm">
            <Filter size={18} className="text-moss" aria-hidden />
            <span>Filtrar reporte por rango de fechas (Día inicial y Día final)</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-stone-600">Día de inicio</span>
              <input
                name="desde"
                type="date"
                defaultValue={fromStr}
                required
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold text-stone-600">Día final</span>
              <input
                name="hasta"
                type="date"
                defaultValue={toStr}
                required
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="min-h-11 flex-1 rounded-lg bg-moss px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-ink active:scale-98"
              >
                Ver reporte
              </button>
              <Link
                href="/finanzas"
                className="min-h-11 inline-flex items-center justify-center rounded-lg border border-line bg-field px-3 text-xs font-bold text-stone-700 transition hover:bg-white"
              >
                Mes actual
              </Link>
            </div>
          </div>
        </form>
      </section>

      {/* Acciones cotidianas: Capital inicial y Gastos */}
      <section className="mx-auto mt-4 grid max-w-5xl gap-3 px-4 lg:grid-cols-2">
        <form action={saveInitialCapitalAction} className="rounded-xl border border-line bg-white p-4 shadow-soft">
          <h2 className="text-base font-extrabold text-ink">Capital inicial del día</h2>
          <p className="text-xs text-stone-500 mt-0.5">Se guarda en el historial de la base de datos.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-ink">Fecha</span>
              <input name="financeDate" type="date" defaultValue={today} className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-ink">Capital inicial ($)</span>
              <input name="initialCapital" inputMode="decimal" placeholder="0.00" className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10" />
            </label>
          </div>
          <button className="mt-3 min-h-11 w-full rounded-lg bg-ink px-4 text-sm font-bold text-white shadow-soft transition hover:bg-moss">
            Guardar en historial
          </button>
        </form>

        <form action={createExpenseAction} className="rounded-xl border border-line bg-white p-4 shadow-soft">
          <h2 className="text-base font-extrabold text-ink">Registrar gasto</h2>
          <p className="text-xs text-stone-500 mt-0.5">Queda guardado permanentemente en el historial.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-ink">Fecha</span>
              <input name="expenseDate" type="date" defaultValue={today} className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10" />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-bold text-ink">Concepto</span>
              <input name="concept" placeholder="Gasolina, comida, papelería..." className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10" />
            </label>
            <label className="space-y-1.5 sm:col-span-3">
              <span className="text-xs font-bold text-ink">Monto ($)</span>
              <input name="amount" inputMode="decimal" placeholder="0.00" className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10" />
            </label>
          </div>
          <button className="mt-3 min-h-11 w-full rounded-lg bg-moss px-4 text-sm font-bold text-white shadow-soft transition hover:bg-ink">
            Guardar gasto
          </button>
        </form>
      </section>

      {/* Historial en pantalla por días */}
      <section className="mx-auto mt-5 max-w-5xl px-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-black text-ink">
            Reporte diario en pantalla ({summary.rows.length} días)
          </h2>
          <span className="text-xs font-bold text-stone-500">
            Del {fromStr} al {toStr}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-soft">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-field text-xs font-black uppercase text-ink">
                <th className="p-3.5">Fecha</th>
                <th className="p-3.5">Cap. inicial</th>
                <th className="p-3.5">Préstamos</th>
                <th className="p-3.5">Cobros</th>
                <th className="p-3.5">Mora cobrada</th>
                <th className="p-3.5">Gastos</th>
                <th className="p-3.5">Saldo final</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-stone-500 font-semibold">
                    No hay registros en el rango seleccionado.
                  </td>
                </tr>
              ) : (
                summary.rows.map((row) => (
                  <tr key={row.date.toISOString()} className="border-b border-line hover:bg-mint/10 transition last:border-0">
                    <td className="p-3.5 font-extrabold text-ink">{formatDate(row.date)}</td>
                    <td className="p-3.5 font-semibold">{formatCurrency(row.initialCapital)}</td>
                    <td className="p-3.5 font-bold text-red-700">{formatCurrency(row.loans)}</td>
                    <td className="p-3.5 font-bold text-moss">{formatCurrency(row.ordinaryCollected)}</td>
                    <td className="p-3.5 font-bold text-moss">{formatCurrency(row.lateFeeCollected)}</td>
                    <td className="p-3.5 font-bold text-red-700">{formatCurrency(row.expenses)}</td>
                    <td className="p-3.5 text-base font-black text-ink">{formatCurrency(row.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Historial de gastos registrados */}
      <section className="mx-auto mt-5 max-w-5xl px-4">
        <div className="rounded-xl border border-line bg-white p-4 shadow-soft">
          <h2 className="text-base font-extrabold text-ink">Gastos registrados en el período</h2>
          <div className="mt-3 grid gap-2">
            {summary.expenses.length === 0 ? (
              <p className="rounded-lg bg-field p-4 text-sm font-semibold text-stone-600">No hay gastos registrados en este rango.</p>
            ) : (
              summary.expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between gap-3 rounded-lg bg-field p-3">
                  <div>
                    <p className="font-extrabold text-ink">{expense.concept}</p>
                    <p className="text-xs text-stone-600 mt-0.5">{formatDate(expense.expenseDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-red-700">{formatCurrency(expense.amount)}</p>
                    <form action={deleteExpenseAction}>
                      <input type="hidden" name="id" value={expense.id} />
                      <button
                        title="Eliminar gasto"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-red-700 transition hover:bg-red-50 active:scale-95"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
