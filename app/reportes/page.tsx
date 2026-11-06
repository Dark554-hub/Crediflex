import { Download, Eye, FileSpreadsheet, Filter } from "lucide-react";
import Link from "next/link";
import { AppBar } from "@/components/mobile/app-bar";
import { todayInMexicoAsUtcDate, todayInputValueInMexico } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { syncAutomaticLateFees } from "@/lib/late-fees";

export const dynamic = "force-dynamic";

const weekDays = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

function collectionDayLabel(type: string, weeklyCollectionDay: number | null, startDate: Date) {
  if (type === "daily") return "Diario";
  if (type === "biweekly") return "Quincenal";
  const idx = weeklyCollectionDay ?? new Date(startDate).getUTCDay();
  return weekDays[idx] ?? "Semanal";
}

function balance(installments: Array<{ scheduledAmount: unknown; lateFeeAmount: unknown; paidAmount: unknown }>) {
  return installments.reduce(
    (total, installment) =>
      total +
      Math.max(
        Number(installment.scheduledAmount) +
          Number(installment.lateFeeAmount) -
          Number(installment.paidAmount),
        0,
      ),
    0,
  );
}

const reports = [
  {
    title: "Creditos activos completos (Incluye atrasados)",
    detail:
      "Todos los creditos vigentes y en atraso con fecha de otorgamiento, capital, total a pagar, pagos hechos (cerrados), mora pagada aparte, pagos atrasados, abonado y saldo pendiente.",
    href: "/reportes/exportar?tipo=activos",
    highlight: true,
  },
  {
    title: "Cartera completa (Activos + Liquidados)",
    detail: "Historial general de todos los prestamos por zona y frecuencia con todos sus indicadores.",
    href: "/reportes/exportar?tipo=cartera",
    highlight: false,
  },
  {
    title: "Reporte detallado de mora y atrasados",
    detail: "Creditos activos con cuotas vencidas, cantidad de pagos atrasados y desglose por cuota.",
    href: "/reportes/exportar?tipo=mora",
    highlight: false,
  },
  {
    title: "Resumen de ganancias",
    detail: "Capital, intereses generados, intereses cobrados, pagos hechos, mora pagada y saldos.",
    href: "/reportes/exportar?tipo=ganancias",
    highlight: false,
  },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { zona?: string; filtro?: string };
}) {
  void syncAutomaticLateFees();

  const today = todayInputValueInMexico();
  const todayUtc = todayInMexicoAsUtcDate();
  const selectedZone = searchParams?.zona ?? "all";
  const selectedFilter = searchParams?.filtro ?? "todos"; // "todos" | "atrasados" | "corriente"

  const [activeCredits, zones] = await Promise.all([
    prisma.credit.findMany({
      where: {
        status: { in: ["active", "delinquent"] },
        ...(selectedZone !== "all" ? { zoneId: selectedZone } : {}),
      },
      include: {
        client: true,
        zone: true,
        installments: { orderBy: { installmentNumber: "asc" } },
        payments: {
          where: { cancelledAt: null },
          include: { allocations: true },
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: [{ zone: { name: "asc" } }, { creditNumber: "asc" }],
    }),
    prisma.zone.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const enrichedCredits = activeCredits.map((credit) => {
    const ordinaryPaid = credit.installments.reduce(
      (sum, inst) => sum + Math.min(Number(inst.paidAmount), Number(inst.scheduledAmount)),
      0,
    );
    const lateFeePaidFromInstallments = credit.installments.reduce(
      (sum, inst) => sum + Math.max(Number(inst.paidAmount) - Number(inst.scheduledAmount), 0),
      0,
    );
    const lateFeePaidFromAllocations = credit.payments.reduce(
      (sum, p) =>
        sum + p.allocations.reduce((aSum, alloc) => aSum + Number(alloc.lateFeeApplied), 0),
      0,
    );
    const moraPagada = Math.max(lateFeePaidFromInstallments, lateFeePaidFromAllocations);

    const totalAmount = Number(credit.totalAmount);
    const pendingSaldo = Math.max(totalAmount - ordinaryPaid, 0);
    const installmentAmt = Number(credit.installmentAmount) || 1;
    // Closed whole payments (excluding late fees)
    const closedPaidCount = Math.min(
      Math.round(ordinaryPaid / installmentAmt),
      credit.installmentCount,
    );

    const overdueInstallments = credit.installments.filter(
      (inst) =>
        new Date(inst.dueDate).getTime() < todayUtc.getTime() &&
        ["pending", "partial", "overdue"].includes(inst.status) &&
        Number(inst.scheduledAmount) - Math.min(Number(inst.paidAmount), Number(inst.scheduledAmount)) > 0.01,
    );
    const overdueCount = overdueInstallments.length;
    const overdueAmount = balance(overdueInstallments);
    const lastPayment = credit.payments[0];

    return {
      credit,
      ordinaryPaid,
      moraPagada,
      pendingSaldo,
      closedPaidCount,
      overdueCount,
      overdueAmount,
      lastPayment,
    };
  });

  const filteredCredits = enrichedCredits.filter((item) => {
    if (selectedFilter === "atrasados") return item.overdueCount > 0;
    if (selectedFilter === "corriente") return item.overdueCount === 0;
    return true;
  });

  const totalActiveCapital = filteredCredits.reduce(
    (s, item) => s + Number(item.credit.principalAmount),
    0,
  );
  const totalOrdinaryPaidSum = filteredCredits.reduce((s, item) => s + item.ordinaryPaid, 0);
  const totalMoraPaidSum = filteredCredits.reduce((s, item) => s + item.moraPagada, 0);
  const totalPendingSum = filteredCredits.reduce((s, item) => s + item.pendingSaldo, 0);
  const totalOverdueCredits = filteredCredits.filter((item) => item.overdueCount > 0).length;

  return (
    <main className="min-h-screen bg-field pb-24">
      <AppBar title="Reportes" />

      <section className="mx-auto max-w-6xl px-4 py-5">
        <div className="rounded-md bg-ink p-5 text-white shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet size={30} className="text-maize" aria-hidden />
                <h1 className="text-2xl font-extrabold">Reportes de Creditos Activos y Exportacion</h1>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Consulta en pantalla o descarga en Excel todos los datos de los creditos activos (incluyendo los atrasados): fecha de otorgamiento, pagos hechos cerrados, mora pagada en columna aparte, pagos atrasados, abonado y saldo.
              </p>
            </div>
            <a
              href={`/reportes/exportar?tipo=activos&zona=${selectedZone}`}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-maize px-5 py-3 text-sm font-extrabold text-ink shadow-soft transition hover:bg-mint"
            >
              <Download size={18} aria-hidden />
              Descargar Creditos Activos (.xlsx)
            </a>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-md bg-white/10 p-3">
              <p className="text-xs font-semibold text-white/70">Creditos activos</p>
              <p className="mt-1 text-xl font-black">
                {filteredCredits.length}{" "}
                <span className="text-xs font-normal text-white/75">
                  ({totalOverdueCredits} con atraso)
                </span>
              </p>
            </div>
            <div className="rounded-md bg-white/10 p-3">
              <p className="text-xs font-semibold text-white/70">Capital prestado</p>
              <p className="mt-1 text-xl font-black">{formatCurrency(totalActiveCapital)}</p>
            </div>
            <div className="rounded-md bg-white/10 p-3">
              <p className="text-xs font-semibold text-white/70">Abonado a cuotas</p>
              <p className="mt-1 text-xl font-black text-mint">{formatCurrency(totalOrdinaryPaidSum)}</p>
            </div>
            <div className="rounded-md bg-white/10 p-3">
              <p className="text-xs font-semibold text-white/70">Mora pagada</p>
              <p className="mt-1 text-xl font-black text-amber-300">{formatCurrency(totalMoraPaidSum)}</p>
            </div>
            <div className="rounded-md bg-white/10 p-3">
              <p className="text-xs font-semibold text-white/70">Saldo por recuperar</p>
              <p className="mt-1 text-xl font-black text-maize">{formatCurrency(totalPendingSum)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Descargas rapidas a Excel */}
      <section className="mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-2">
        {reports.map((report) => (
          <a
            key={report.href}
            href={report.href}
            className={`rounded-md border p-4 shadow-soft transition ${
              report.highlight
                ? "border-moss bg-mint/35 hover:border-ink"
                : "border-line bg-white hover:border-maize"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-ink">{report.title}</h2>
                <p className="mt-1 text-xs leading-5 text-stone-700">{report.detail}</p>
              </div>
              <Download className="shrink-0 text-moss" size={22} aria-hidden />
            </div>
          </a>
        ))}
      </section>

      {/* Reporte en vivo de todos los creditos activos (incluyendo atrasados) */}
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <div className="rounded-md border border-line bg-white p-4 shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-ink">
                Detalle de creditos activos ({filteredCredits.length})
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-stone-500">
                Pagos hechos en numeros cerrados (sin sumar la mora) y mora pagada en columna independiente.
              </p>
            </div>

            <form action="/reportes" className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Filter size={16} className="text-moss" aria-hidden />
                <select
                  name="zona"
                  defaultValue={selectedZone}
                  className="min-h-10 rounded-md border border-line bg-field px-3 text-xs font-bold text-ink outline-none focus:border-moss"
                >
                  <option value="all">Todas las zonas</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <select
                name="filtro"
                defaultValue={selectedFilter}
                className="min-h-10 rounded-md border border-line bg-field px-3 text-xs font-bold text-ink outline-none focus:border-moss"
              >
                <option value="todos">Todos los activos (Al corriente + Atrasados)</option>
                <option value="atrasados">Solo con pagos atrasados</option>
                <option value="corriente">Solo al corriente (0 atrasos)</option>
              </select>

              <button
                type="submit"
                className="min-h-10 rounded-md bg-ink px-3.5 text-xs font-extrabold text-white transition hover:bg-moss"
              >
                Filtrar
              </button>
            </form>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1060px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-line bg-field text-[11px] font-black uppercase tracking-wider text-stone-600">
                  <th className="px-3 py-3">Folio / Cliente</th>
                  <th className="px-3 py-3">Zona / Cobro</th>
                  <th className="px-3 py-3">Fecha Credito</th>
                  <th className="px-3 py-3">Prestamo / Total</th>
                  <th className="px-3 py-3">Cuota</th>
                  <th className="px-3 py-3">Pagos Hechos</th>
                  <th className="px-3 py-3">Pagos Atrasados</th>
                  <th className="px-3 py-3">Abonado Cuotas</th>
                  <th className="px-3 py-3">Mora Pagada</th>
                  <th className="px-3 py-3">Saldo Pendiente</th>
                  <th className="px-3 py-3">Ultimo Pago</th>
                  <th className="px-3 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredCredits.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-sm font-semibold text-stone-500">
                      No hay creditos activos para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredCredits.map((item) => {
                    const { credit, ordinaryPaid, moraPagada, pendingSaldo, closedPaidCount, overdueCount, overdueAmount, lastPayment } = item;
                    const overdueBadgeClass =
                      overdueCount === 0
                        ? "bg-green-100 text-green-800 border-green-300"
                        : overdueCount <= 5
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-red-100 text-red-800 border-red-300";

                    return (
                      <tr key={credit.id} className="hover:bg-field/60">
                        <td className="px-3 py-3">
                          <p className="font-extrabold text-ink">
                            #{credit.creditNumber ?? "-"} · {credit.client.fullName}
                          </p>
                          <p className="text-[11px] text-stone-500">
                            {credit.client.phone || "Sin tel"} · {credit.client.address}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-bold text-ink">{credit.zone.name}</p>
                          <p className="text-[11px] text-stone-500">
                            {credit.productType === "express" ? "Express" : "Normal"} ·{" "}
                            {collectionDayLabel(credit.type, credit.weeklyCollectionDay, credit.startDate)}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-bold text-ink">{formatDate(credit.startDate)}</p>
                          <p className="text-[11px] text-stone-500">
                            Vence: {formatDate(credit.expectedEndDate)}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-bold text-ink">{formatCurrency(credit.principalAmount)}</p>
                          <p className="text-[11px] text-stone-500">
                            Total: {formatCurrency(credit.totalAmount)}
                          </p>
                        </td>
                        <td className="px-3 py-3 font-bold text-ink">
                          {formatCurrency(credit.installmentAmount)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-extrabold text-ink">
                            {closedPaidCount} de {credit.installmentCount}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-start gap-0.5">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-extrabold ${overdueBadgeClass}`}
                            >
                              {overdueCount} {overdueCount === 1 ? "atrasado" : "atrasados"}
                            </span>
                            {overdueAmount > 0 ? (
                              <span className="text-[11px] font-bold text-red-700">
                                {formatCurrency(overdueAmount)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-extrabold text-moss">
                          {formatCurrency(ordinaryPaid)}
                        </td>
                        <td className="px-3 py-3 font-extrabold text-amber-700">
                          {formatCurrency(moraPagada)}
                        </td>
                        <td className="px-3 py-3 font-extrabold text-ink">
                          {formatCurrency(pendingSaldo)}
                        </td>
                        <td className="px-3 py-3">
                          {lastPayment ? (
                            <>
                              <p className="font-bold text-ink">{formatDate(lastPayment.paymentDate)}</p>
                              <p className="text-[11px] text-moss">{formatCurrency(lastPayment.amount)}</p>
                            </>
                          ) : (
                            <span className="text-stone-400">Sin pagos</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link
                            href={`/creditos/${credit.id}`}
                            className="inline-flex min-h-8 items-center gap-1 rounded-md border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink transition hover:border-moss"
                          >
                            <Eye size={13} aria-hidden />
                            Detalles
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Historial de pagos por fecha */}
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <form
          action="/reportes/exportar"
          className="rounded-md border border-line bg-white p-4 shadow-soft sm:p-6"
        >
          <input type="hidden" name="tipo" value="pagos" />
          <h2 className="text-lg font-extrabold text-ink">Exportar historial de pagos por rango de fechas</h2>
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
            Descargar pagos (.xlsx)
          </button>
        </form>
      </section>
    </main>
  );
}
