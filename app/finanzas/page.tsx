import { Trash2, WalletCards } from "lucide-react";
import { createExpenseAction, deleteExpenseAction, saveInitialCapitalAction } from "@/app/finanzas/actions";
import { AppBar } from "@/components/mobile/app-bar";
import { todayInputValueInMexico } from "@/lib/dates";
import { getFinanceSummary } from "@/lib/finances";
import { formatDate } from "@/lib/format";
import { formatCurrency } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const summary = await getFinanceSummary(10);
  const today = todayInputValueInMexico();

  return (
    <main className="min-h-screen bg-field pb-8">
      <AppBar title="Finanzas" />

      <section className="mx-auto max-w-5xl px-4 py-5">
        <div className="rounded-md bg-ink p-4 text-white shadow-soft">
          <WalletCards size={34} className="text-maize" aria-hidden />
          <h1 className="mt-3 text-2xl font-extrabold">Resumen de finanzas</h1>
          <p className="mt-2 text-sm leading-6 text-white/75">
            Capital inicial, prestamos, cobros, mora cobrada, gastos y saldo por dia.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-3 px-4 lg:grid-cols-2">
        <form action={saveInitialCapitalAction} className="rounded-md border border-line bg-white p-4 shadow-soft">
          <h2 className="text-lg font-extrabold text-ink">Capital inicial del dia</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">Fecha</span>
              <input name="financeDate" type="date" defaultValue={today} className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">Capital inicial</span>
              <input name="initialCapital" inputMode="decimal" placeholder="0.00" className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10" />
            </label>
          </div>
          <button className="mt-4 min-h-12 w-full rounded-md bg-ink px-4 text-sm font-bold text-white shadow-soft transition hover:bg-moss">
            Guardar capital
          </button>
        </form>

        <form action={createExpenseAction} className="rounded-md border border-line bg-white p-4 shadow-soft">
          <h2 className="text-lg font-extrabold text-ink">Registrar gasto</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">Fecha</span>
              <input name="expenseDate" type="date" defaultValue={today} className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10" />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-ink">Concepto</span>
              <input name="concept" placeholder="Gasolina, comida, papeleria..." className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10" />
            </label>
            <label className="space-y-2 sm:col-span-3">
              <span className="text-sm font-semibold text-ink">Monto</span>
              <input name="amount" inputMode="decimal" placeholder="0.00" className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10" />
            </label>
          </div>
          <button className="mt-4 min-h-12 w-full rounded-md bg-moss px-4 text-sm font-bold text-white shadow-soft transition hover:bg-ink">
            Guardar gasto
          </button>
        </form>
      </section>

      <section className="mx-auto mt-4 max-w-5xl px-4">
        <div className="overflow-x-auto rounded-md border border-line bg-white shadow-soft">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-mint/50 text-xs font-black uppercase text-ink">
                <th className="p-3">Fecha</th>
                <th className="p-3">Capital inicial</th>
                <th className="p-3">Prestamos</th>
                <th className="p-3">Cobros</th>
                <th className="p-3">Mora cobrada</th>
                <th className="p-3">Gastos</th>
                <th className="p-3">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => (
                <tr key={row.date.toISOString()} className="border-b border-line last:border-0">
                  <td className="p-3 font-bold text-ink">{formatDate(row.date)}</td>
                  <td className="p-3">{formatCurrency(row.initialCapital)}</td>
                  <td className="p-3 text-red-700">{formatCurrency(row.loans)}</td>
                  <td className="p-3 text-moss">{formatCurrency(row.ordinaryCollected)}</td>
                  <td className="p-3 text-moss">{formatCurrency(row.lateFeeCollected)}</td>
                  <td className="p-3 text-red-700">{formatCurrency(row.expenses)}</td>
                  <td className="p-3 text-lg font-black text-ink">{formatCurrency(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-5xl px-4">
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <h2 className="text-lg font-extrabold text-ink">Gastos registrados</h2>
          <div className="mt-3 grid gap-2">
            {summary.expenses.length === 0 ? (
              <p className="rounded-md bg-field p-4 text-sm font-semibold text-stone-700">No hay gastos registrados.</p>
            ) : (
              summary.expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between gap-3 rounded-md bg-field p-3">
                  <div>
                    <p className="font-extrabold text-ink">{expense.concept}</p>
                    <p className="text-sm text-stone-600">{formatDate(expense.expenseDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-red-700">{formatCurrency(expense.amount)}</p>
                    <form action={deleteExpenseAction}>
                      <input type="hidden" name="id" value={expense.id} />
                      <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-red-700">
                        <Trash2 size={17} aria-hidden />
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
