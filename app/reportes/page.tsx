import { CalendarDays, Download, Eye, FileSpreadsheet, Filter, RefreshCw, Users } from "lucide-react";
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
    title: "Reporte de renovaciones (Por dia y por usuario)",
    detail:
      "Cuanto dinero se renovo cada dia, apartado por usuario/cliente y por operador, con folios anteriores y nuevos.",
    href: "/reportes/exportar?tipo=renovaciones",
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

  const [activeCredits, allClientCredits, zones, defaultProfile] = await Promise.all([
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
    prisma.credit.findMany({
      where: {
        status: { not: "cancelled" },
        ...(selectedZone !== "all" ? { zoneId: selectedZone } : {}),
      },
      include: {
        client: true,
        zone: true,
        creator: true,
        renewedFrom: true,
      },
      orderBy: [{ startDate: "asc" }, { creditNumber: "asc" }, { createdAt: "asc" }],
    }),
    prisma.zone.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.profile.findFirst({
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const enrichedCredits = activeCredits.map((credit) => {
    const ordinaryPaid = Math.round(
      credit.installments.reduce(
        (sum, inst) => sum + Math.min(Number(inst.paidAmount), Number(inst.scheduledAmount)),
        0,
      ),
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
    const moraPagada = Math.round(Math.max(lateFeePaidFromInstallments, lateFeePaidFromAllocations));

    const totalAmount = Math.round(Number(credit.totalAmount));
    const pendingSaldo = Math.max(totalAmount - ordinaryPaid, 0);
    const installmentAmt = Number(credit.installmentAmount) || 1;
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
    const overdueAmount = Math.round(balance(overdueInstallments));
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
    (s, item) => s + Math.round(Number(item.credit.principalAmount)),
    0,
  );
  const totalOrdinaryPaidSum = filteredCredits.reduce((s, item) => s + item.ordinaryPaid, 0);
  const totalMoraPaidSum = filteredCredits.reduce((s, item) => s + item.moraPagada, 0);
  const totalPendingSum = filteredCredits.reduce((s, item) => s + item.pendingSaldo, 0);
  const totalOverdueCredits = filteredCredits.filter((item) => item.overdueCount > 0).length;

  // Construir reporte de renovaciones (creditos con renewedFromCreditId o 2do+ credito del mismo cliente)
  const creditsByClient = new Map<string, typeof allClientCredits>();
  for (const c of allClientCredits) {
    const list = creditsByClient.get(c.clientId) ?? [];
    list.push(c);
    creditsByClient.set(c.clientId, list);
  }

  type RenewalItem = {
    credit: (typeof allClientCredits)[number];
    previousCredit: (typeof allClientCredits)[number] | typeof allClientCredits[number]["renewedFrom"];
    dateKey: string;
    principalRenewed: number;
    totalRenewed: number;
    operatorName: string;
  };

  const renewalItems: RenewalItem[] = [];
  for (const [, clientCredits] of Array.from(creditsByClient.entries())) {
    clientCredits.forEach((credit, idx) => {
      const isRenewal = Boolean(credit.renewedFromCreditId) || idx > 0;
      if (!isRenewal) return;

      const previousCredit = credit.renewedFrom ?? (idx > 0 ? clientCredits[idx - 1] : null);
      const dateKey = new Date(credit.startDate).toISOString().slice(0, 10);
      const operatorName =
        credit.creator?.fullName || defaultProfile?.fullName || "Operador principal";

      renewalItems.push({
        credit,
        previousCredit,
        dateKey,
        principalRenewed: Math.round(Number(credit.principalAmount)),
        totalRenewed: Math.round(Number(credit.totalAmount)),
        operatorName,
      });
    });
  }

  renewalItems.sort(
    (a, b) => new Date(b.credit.startDate).getTime() - new Date(a.credit.startDate).getTime(),
  );

  // Agrupar renovaciones por dia ("cada dia cuanto renovo en dinero")
  const renewalsByDayMap = new Map<
    string,
    {
      dateKey: string;
      date: Date;
      count: number;
      principalSum: number;
      totalSum: number;
      clients: string[];
    }
  >();

  for (const item of renewalItems) {
    const existing = renewalsByDayMap.get(item.dateKey);
    if (existing) {
      existing.count += 1;
      existing.principalSum += item.principalRenewed;
      existing.totalSum += item.totalRenewed;
      if (!existing.clients.includes(item.credit.client.fullName)) {
        existing.clients.push(item.credit.client.fullName);
      }
    } else {
      renewalsByDayMap.set(item.dateKey, {
        dateKey: item.dateKey,
        date: item.credit.startDate,
        count: 1,
        principalSum: item.principalRenewed,
        totalSum: item.totalRenewed,
        clients: [item.credit.client.fullName],
      });
    }
  }
  const renewalsByDay = Array.from(renewalsByDayMap.values()).sort((a, b) =>
    b.dateKey.localeCompare(a.dateKey),
  );

  // Agrupar renovaciones por usuario/cliente ("y por usuario un apartado mas")
  const renewalsByUserMap = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      phone: string;
      zoneName: string;
      operatorName: string;
      renewalCount: number;
      principalSum: number;
      totalSum: number;
      lastRenewalDate: Date;
      latestCreditId: string;
      folios: string[];
    }
  >();

  for (const item of renewalItems) {
    const key = item.credit.clientId;
    const prevFolio = item.previousCredit?.creditNumber
      ? `#${item.previousCredit.creditNumber}`
      : "Previo";
    const newFolio = item.credit.creditNumber ? `#${item.credit.creditNumber}` : "-";
    const folioPair = `${prevFolio} → ${newFolio} (${formatCurrency(item.principalRenewed)})`;

    const existing = renewalsByUserMap.get(key);
    if (existing) {
      existing.renewalCount += 1;
      existing.principalSum += item.principalRenewed;
      existing.totalSum += item.totalRenewed;
      if (new Date(item.credit.startDate).getTime() > new Date(existing.lastRenewalDate).getTime()) {
        existing.lastRenewalDate = item.credit.startDate;
        existing.latestCreditId = item.credit.id;
      }
      existing.folios.push(folioPair);
    } else {
      renewalsByUserMap.set(key, {
        clientId: item.credit.clientId,
        clientName: item.credit.client.fullName,
        phone: item.credit.client.phone || "Sin tel",
        zoneName: item.credit.zone.name,
        operatorName: item.operatorName,
        renewalCount: 1,
        principalSum: item.principalRenewed,
        totalSum: item.totalRenewed,
        lastRenewalDate: item.credit.startDate,
        latestCreditId: item.credit.id,
        folios: [folioPair],
      });
    }
  }
  const renewalsByUser = Array.from(renewalsByUserMap.values()).sort(
    (a, b) => new Date(b.lastRenewalDate).getTime() - new Date(a.lastRenewalDate).getTime(),
  );

  // Agrupar por Operador / Zona
  const renewalsByOperatorMap = new Map<
    string,
    {
      operatorName: string;
      zoneName: string;
      count: number;
      principalSum: number;
      totalSum: number;
    }
  >();
  for (const item of renewalItems) {
    const key = `${item.operatorName}__${item.credit.zone.name}`;
    const existing = renewalsByOperatorMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.principalSum += item.principalRenewed;
      existing.totalSum += item.totalRenewed;
    } else {
      renewalsByOperatorMap.set(key, {
        operatorName: item.operatorName,
        zoneName: item.credit.zone.name,
        count: 1,
        principalSum: item.principalRenewed,
        totalSum: item.totalRenewed,
      });
    }
  }
  const renewalsByOperator = Array.from(renewalsByOperatorMap.values());

  const totalRenewedCapital = renewalItems.reduce((s, item) => s + item.principalRenewed, 0);
  const totalRenewedWithInterest = renewalItems.reduce((s, item) => s + item.totalRenewed, 0);

  return (
    <main className="min-h-screen bg-field pb-24">
      <AppBar title="Reportes" />

      <section className="mx-auto max-w-6xl px-4 py-5">
        <div className="rounded-md bg-ink p-5 text-white shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet size={30} className="text-maize" aria-hidden />
                <h1 className="text-2xl font-extrabold">Reportes de Creditos, Renovaciones y Exportacion</h1>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Consulta en pantalla o descarga en Excel los creditos activos (sin decimales y con mora separada) y el reporte completo de renovaciones por dia y por usuario.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/reportes/exportar?tipo=activos&zona=${selectedZone}`}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-maize px-4 py-2.5 text-xs font-extrabold text-ink shadow-soft transition hover:bg-mint"
              >
                <Download size={16} aria-hidden />
                Creditos Activos (.xlsx)
              </a>
              <a
                href={`/reportes/exportar?tipo=renovaciones&zona=${selectedZone}`}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-mint px-4 py-2.5 text-xs font-extrabold text-ink shadow-soft transition hover:bg-maize"
              >
                <Download size={16} aria-hidden />
                Renovaciones (.xlsx)
              </a>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-6">
            <div className="rounded-md bg-white/10 p-3">
              <p className="text-xs font-semibold text-white/70">Creditos activos</p>
              <p className="mt-1 text-xl font-black">
                {filteredCredits.length}{" "}
                <span className="text-xs font-normal text-white/75">
                  ({totalOverdueCredits} atraso)
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
            <div className="rounded-md bg-white/10 p-3">
              <p className="text-xs font-semibold text-white/70">Dinero renovado</p>
              <p className="mt-1 text-xl font-black text-mint">{formatCurrency(totalRenewedCapital)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Descargas rapidas a Excel */}
      <section className="mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* REPORTE DE RENOVACIONES: POR DIA Y POR USUARIO */}
      <section id="renovaciones" className="mx-auto mt-6 max-w-6xl px-4">
        <div className="rounded-md border border-line bg-white p-4 shadow-soft sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <RefreshCw size={20} className="text-moss" aria-hidden />
                <h2 className="text-xl font-black text-ink">
                  Reporte de Renovaciones ({renewalItems.length})
                </h2>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-stone-500">
                Desglose de cuanto dinero se renovo cada dia y apartado especial por usuario/cliente y operador.
              </p>
            </div>
            <a
              href={`/reportes/exportar?tipo=renovaciones&zona=${selectedZone}`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-xs font-extrabold text-white transition hover:bg-moss"
            >
              <Download size={15} aria-hidden />
              Descargar Reporte de Renovaciones (.xlsx)
            </a>
          </div>

          {/* Resumen rapido de renovaciones */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md bg-field p-3">
              <p className="text-xs font-bold uppercase text-stone-500">Total renovaciones</p>
              <p className="mt-1 text-2xl font-black text-ink">{renewalItems.length}</p>
            </div>
            <div className="rounded-md bg-field p-3">
              <p className="text-xs font-bold uppercase text-stone-500">Dinero renovado (Capital)</p>
              <p className="mt-1 text-2xl font-black text-moss">{formatCurrency(totalRenewedCapital)}</p>
            </div>
            <div className="rounded-md bg-field p-3">
              <p className="text-xs font-bold uppercase text-stone-500">Total renovado con interes</p>
              <p className="mt-1 text-2xl font-black text-ink">{formatCurrency(totalRenewedWithInterest)}</p>
            </div>
            <div className="rounded-md bg-field p-3">
              <p className="text-xs font-bold uppercase text-stone-500">Usuarios que renovaron</p>
              <p className="mt-1 text-2xl font-black text-ink">{renewalsByUser.length}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Apartado 1: Cada dia cuanto renovo en dinero */}
            <div className="rounded-md border border-line bg-field/40 p-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-moss" aria-hidden />
                <h3 className="text-base font-black text-ink">
                  Renovaciones por Dia (Dinero renovado cada dia)
                </h3>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-line bg-field text-[11px] font-black uppercase text-stone-600">
                      <th className="px-3 py-2.5">Fecha</th>
                      <th className="px-3 py-2.5">Renovaciones</th>
                      <th className="px-3 py-2.5">Dinero Renovado</th>
                      <th className="px-3 py-2.5">Total c/ Interes</th>
                      <th className="px-3 py-2.5">Usuarios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-white">
                    {renewalsByDay.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-stone-500">
                          No hay renovaciones registradas.
                        </td>
                      </tr>
                    ) : (
                      renewalsByDay.map((day) => (
                        <tr key={day.dateKey} className="hover:bg-field/50">
                          <td className="px-3 py-2.5 font-extrabold text-ink">
                            {formatDate(day.date)}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-ink">{day.count}</td>
                          <td className="px-3 py-2.5 font-extrabold text-moss">
                            {formatCurrency(day.principalSum)}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-ink">
                            {formatCurrency(day.totalSum)}
                          </td>
                          <td className="px-3 py-2.5 text-[11px] text-stone-600">
                            {day.clients.join(", ")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Apartado 2: Por Usuario / Operador y Cliente */}
            <div className="rounded-md border border-line bg-field/40 p-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-moss" aria-hidden />
                <h3 className="text-base font-black text-ink">
                  Apartado por Usuario (Operador y Clientes)
                </h3>
              </div>

              {/* Resumen por Operador / Usuario del sistema */}
              {renewalsByOperator.length > 0 ? (
                <div className="mt-3 mb-4 rounded-md border border-line bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-stone-500">
                    Total renovado por Usuario Operador / Zona
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {renewalsByOperator.map((op) => (
                      <div
                        key={`${op.operatorName}-${op.zoneName}`}
                        className="flex items-center justify-between rounded-md bg-field px-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-extrabold text-ink">{op.operatorName}</p>
                          <p className="text-[11px] text-stone-500">
                            Zona {op.zoneName} · {op.count} renovaciones
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-moss">{formatCurrency(op.principalSum)}</p>
                          <p className="text-[10px] text-stone-500">
                            Total: {formatCurrency(op.totalSum)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Desglose por Usuario / Cliente que renovo */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-line bg-field text-[11px] font-black uppercase text-stone-600">
                      <th className="px-3 py-2.5">Usuario / Cliente</th>
                      <th className="px-3 py-2.5">Veces</th>
                      <th className="px-3 py-2.5">Dinero Renovado</th>
                      <th className="px-3 py-2.5">Ultima Fecha</th>
                      <th className="px-3 py-2.5 text-right">Prestamo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-white">
                    {renewalsByUser.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-stone-500">
                          No hay usuarios con renovaciones.
                        </td>
                      </tr>
                    ) : (
                      renewalsByUser.map((u) => (
                        <tr key={u.clientId} className="hover:bg-field/50">
                          <td className="px-3 py-2.5">
                            <p className="font-extrabold text-ink">{u.clientName}</p>
                            <p className="text-[11px] text-stone-500">
                              {u.zoneName} · {u.folios.join(" | ")}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 font-extrabold text-ink">{u.renewalCount}</td>
                          <td className="px-3 py-2.5">
                            <p className="font-extrabold text-moss">
                              {formatCurrency(u.principalSum)}
                            </p>
                            <p className="text-[10px] text-stone-500">
                              Total: {formatCurrency(u.totalSum)}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 font-bold text-ink">
                            {formatDate(u.lastRenewalDate)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Link
                              href={`/creditos/${u.latestCreditId}`}
                              className="inline-flex min-h-7 items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[11px] font-bold text-ink hover:border-moss"
                            >
                              <Eye size={12} aria-hidden />
                              Ver
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
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

