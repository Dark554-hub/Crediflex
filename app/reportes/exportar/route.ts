import * as XLSX from "xlsx";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayInMexicoAsUtcDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { syncAutomaticLateFees } from "@/lib/late-fees";

export const dynamic = "force-dynamic";

function parseDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function addDaysUtc(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateLabel(date: Date | null | undefined) {
  if (!date) return "-";
  return new Date(date).toISOString().slice(0, 10);
}

const weekDays = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

function collectionDayLabel(type: string, weeklyCollectionDay: number | null, startDate: Date) {
  if (type === "daily") return "Diario (Lunes a Sabado)";
  if (type === "biweekly") return "Quincenal (Cada 15 dias)";
  const idx = weeklyCollectionDay ?? new Date(startDate).getUTCDay();
  return weekDays[idx] ?? "Semanal";
}

function statusLabel(status: string, hasOverdue: boolean) {
  if (status === "settled") return "Liquidado";
  if (status === "cancelled") return "Cancelado";
  if (status === "delinquent" || hasOverdue) return "Activo (Con atraso)";
  return "Activo (Al corriente)";
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

function addSheet(workbook: XLSX.WorkBook, name: string, rows: unknown[]) {
  const safeName = name.replace(/[\\/?*:[\]]/g, " ").slice(0, 31) || "Reporte";
  const sheet = rows.length > 0 ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([["Sin datos"]]);
  XLSX.utils.book_append_sheet(workbook, sheet, safeName);
}

function workbookResponse(workbook: XLSX.WorkBook, filename: string) {
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function buildDetailedCreditRow(
  credit: {
    creditNumber: number | null;
    productType: string;
    type: string;
    status: string;
    startDate: Date;
    expectedEndDate: Date;
    weeklyCollectionDay: number | null;
    principalAmount: unknown;
    interestRate: unknown;
    interestAmount: unknown;
    totalAmount: unknown;
    installmentCount: number;
    installmentAmount: unknown;
    client: {
      fullName: string;
      identification: string | null;
      clientNumber: string | null;
      phone: string | null;
      address: string;
    };
    zone: {
      name: string;
    };
    installments: Array<{
      installmentNumber: number;
      dueDate: Date;
      scheduledAmount: unknown;
      lateFeeAmount: unknown;
      paidAmount: unknown;
      status: string;
    }>;
    payments: Array<{
      amount: unknown;
      paymentDate: Date;
      allocations?: Array<{
        amountApplied: unknown;
        lateFeeApplied: unknown;
      }>;
    }>;
  },
  today: Date,
) {
  const sortedInstallments = [...credit.installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber,
  );

  // Separate ordinary paid from late fees paid
  const ordinaryPaidFromInstallments = sortedInstallments.reduce(
    (sum, inst) => sum + Math.min(Number(inst.paidAmount), Number(inst.scheduledAmount)),
    0,
  );
  const lateFeePaidFromInstallments = sortedInstallments.reduce(
    (sum, inst) => sum + Math.max(Number(inst.paidAmount) - Number(inst.scheduledAmount), 0),
    0,
  );

  // Also check allocations if present
  const lateFeePaidFromAllocations = credit.payments.reduce(
    (sum, p) =>
      sum +
      (p.allocations?.reduce((aSum, alloc) => aSum + Number(alloc.lateFeeApplied), 0) ?? 0),
    0,
  );

  const moraPagada = Math.round(Math.max(lateFeePaidFromInstallments, lateFeePaidFromAllocations));
  const ordinaryPaid = Math.round(ordinaryPaidFromInstallments);
  const totalAmount = Math.round(Number(credit.totalAmount));
  const pendingOrdinarySaldo = Math.max(totalAmount - ordinaryPaid, 0);

  const installmentAmt = Number(credit.installmentAmount) || 1;
  // Whole closed payments (excluding late fees)
  const closedPaidInstallments = Math.min(
    Math.round(ordinaryPaid / installmentAmt),
    credit.installmentCount,
  );

  const overdueInstallments = sortedInstallments.filter(
    (inst) =>
      new Date(inst.dueDate).getTime() < today.getTime() &&
      ["pending", "partial", "overdue"].includes(inst.status) &&
      Number(inst.scheduledAmount) - Math.min(Number(inst.paidAmount), Number(inst.scheduledAmount)) > 0.01,
  );
  const overdueCount = overdueInstallments.length;
  const overdueAmount = Math.round(balance(overdueInstallments));

  const pendingInstallmentsCount = Math.max(credit.installmentCount - closedPaidInstallments, 0);
  const nextPendingInstallment = sortedInstallments.find(
    (inst) =>
      ["pending", "partial", "overdue"].includes(inst.status) &&
      Number(inst.scheduledAmount) + Number(inst.lateFeeAmount) - Number(inst.paidAmount) > 0.01,
  );

  const sortedPayments = [...credit.payments].sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
  );
  const lastPayment = sortedPayments[0];

  return {
    "Folio Credito": credit.creditNumber ? `#${credit.creditNumber}` : "-",
    Cliente: credit.client.fullName,
    "Cedula / ID": credit.client.identification || credit.client.clientNumber || "-",
    Telefono: credit.client.phone || "-",
    Direccion: credit.client.address,
    Zona: credit.zone.name,
    Producto: credit.productType === "express" ? "Express" : "Normal",
    Frecuencia:
      credit.type === "daily" ? "Diario" : credit.type === "biweekly" ? "Quincenal" : "Semanal",
    "Dia de Cobro": collectionDayLabel(credit.type, credit.weeklyCollectionDay, credit.startDate),
    "Fecha de Otorgamiento": dateLabel(credit.startDate),
    "Fecha de Vencimiento": dateLabel(credit.expectedEndDate),
    "Capital Prestado": Math.round(Number(credit.principalAmount)),
    "Tasa Interes (%)": Math.round(Number(credit.interestRate) * 100),
    "Interes / Financiamiento": Math.round(Number(credit.interestAmount)),
    "Total a Pagar": totalAmount,
    "Valor Cuota": Math.round(Number(credit.installmentAmount)),
    "Total Cuotas": credit.installmentCount,
    "Pagos Hechos": closedPaidInstallments,
    "Cuotas Pendientes": pendingInstallmentsCount,
    "Pagos Atrasados": overdueCount,
    "Monto Atrasado": overdueAmount,
    "Abonado a Cuotas ($)": ordinaryPaid,
    "Mora Pagada ($)": moraPagada,
    "Saldo Pendiente ($)": pendingOrdinarySaldo,
    "Fecha Ultimo Pago": lastPayment ? dateLabel(lastPayment.paymentDate) : "Sin pagos",
    "Monto Ultimo Pago": lastPayment ? Math.round(Number(lastPayment.amount)) : 0,
    "Proximo Vencimiento": nextPendingInstallment ? dateLabel(nextPendingInstallment.dueDate) : "-",
    Estatus: statusLabel(credit.status, overdueCount > 0),
  };
}

export async function GET(request: NextRequest) {
  await syncAutomaticLateFees();

  const today = todayInMexicoAsUtcDate();
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("tipo") ?? "activos";
  const zoneFilter = searchParams.get("zona") ?? "all";
  const workbook = XLSX.utils.book_new();

  if (type === "renovaciones") {
    const [allClientCredits, defaultProfile] = await Promise.all([
      prisma.credit.findMany({
        where: {
          status: { not: "cancelled" },
          ...(zoneFilter !== "all" ? { zoneId: zoneFilter } : {}),
        },
        include: {
          client: true,
          zone: true,
          creator: true,
          renewedFrom: true,
        },
        orderBy: [{ startDate: "asc" }, { creditNumber: "asc" }, { createdAt: "asc" }],
      }),
      prisma.profile.findFirst({
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const creditsByClient = new Map<string, typeof allClientCredits>();
    for (const c of allClientCredits) {
      const list = creditsByClient.get(c.clientId) ?? [];
      list.push(c);
      creditsByClient.set(c.clientId, list);
    }

    type RenewalRow = {
      credit: (typeof allClientCredits)[number];
      previousCredit: (typeof allClientCredits)[number] | typeof allClientCredits[number]["renewedFrom"];
      dateKey: string;
      principalRenewed: number;
      interestRenewed: number;
      totalRenewed: number;
      operatorName: string;
    };

    const renewalItems: RenewalRow[] = [];
    for (const [, clientCredits] of Array.from(creditsByClient.entries())) {
      clientCredits.forEach((credit, idx) => {
        const isRenewal = Boolean(credit.renewedFromCreditId) || idx > 0;
        if (!isRenewal) return;

        const previousCredit = credit.renewedFrom ?? (idx > 0 ? clientCredits[idx - 1] : null);
        const dateKey = dateLabel(credit.startDate);
        const operatorName =
          credit.creator?.fullName || defaultProfile?.fullName || "Operador principal";

        renewalItems.push({
          credit,
          previousCredit,
          dateKey,
          principalRenewed: Math.round(Number(credit.principalAmount)),
          interestRenewed: Math.round(Number(credit.interestAmount)),
          totalRenewed: Math.round(Number(credit.totalAmount)),
          operatorName,
        });
      });
    }

    renewalItems.sort(
      (a, b) => new Date(b.credit.startDate).getTime() - new Date(a.credit.startDate).getTime(),
    );

    // 1. Por Dia ("cada dia cuanto renovo en dinero")
    const byDayMap = new Map<
      string,
      {
        Fecha: string;
        "Cantidad Renovaciones": number;
        "Dinero Renovado Capital ($)": number;
        "Interes Generado ($)": number;
        "Total Renovado c/ Interes ($)": number;
        "Usuarios / Clientes": string[];
      }
    >();

    for (const item of renewalItems) {
      const existing = byDayMap.get(item.dateKey);
      if (existing) {
        existing["Cantidad Renovaciones"] += 1;
        existing["Dinero Renovado Capital ($)"] += item.principalRenewed;
        existing["Interes Generado ($)"] += item.interestRenewed;
        existing["Total Renovado c/ Interes ($)"] += item.totalRenewed;
        if (!existing["Usuarios / Clientes"].includes(item.credit.client.fullName)) {
          existing["Usuarios / Clientes"].push(item.credit.client.fullName);
        }
      } else {
        byDayMap.set(item.dateKey, {
          Fecha: item.dateKey,
          "Cantidad Renovaciones": 1,
          "Dinero Renovado Capital ($)": item.principalRenewed,
          "Interes Generado ($)": item.interestRenewed,
          "Total Renovado c/ Interes ($)": item.totalRenewed,
          "Usuarios / Clientes": [item.credit.client.fullName],
        });
      }
    }

    const byDayRows = Array.from(byDayMap.values())
      .sort((a, b) => b.Fecha.localeCompare(a.Fecha))
      .map((row) => ({
        Fecha: row.Fecha,
        "Cantidad Renovaciones": row["Cantidad Renovaciones"],
        "Dinero Renovado Capital ($)": row["Dinero Renovado Capital ($)"],
        "Interes Generado ($)": row["Interes Generado ($)"],
        "Total Renovado c/ Interes ($)": row["Total Renovado c/ Interes ($)"],
        "Usuarios / Clientes": row["Usuarios / Clientes"].join(", "),
      }));

    // 2. Por Usuario / Cliente ("por usuario un apartado mas")
    const byUserMap = new Map<
      string,
      {
        "Usuario / Cliente": string;
        "Cedula / ID": string;
        Telefono: string;
        Direccion: string;
        Zona: string;
        Operador: string;
        "Veces que Renovo": number;
        "Dinero Total Renovado ($)": number;
        "Total con Interes ($)": number;
        "Ultima Fecha Renovacion": string;
        "Historial Folios": string[];
      }
    >();

    for (const item of renewalItems) {
      const key = item.credit.clientId;
      const prevFolio = item.previousCredit?.creditNumber
        ? `#${item.previousCredit.creditNumber}`
        : "Previo";
      const newFolio = item.credit.creditNumber ? `#${item.credit.creditNumber}` : "-";
      const folioLabel = `${prevFolio} -> ${newFolio} ($${item.principalRenewed})`;

      const existing = byUserMap.get(key);
      if (existing) {
        existing["Veces que Renovo"] += 1;
        existing["Dinero Total Renovado ($)"] += item.principalRenewed;
        existing["Total con Interes ($)"] += item.totalRenewed;
        if (item.dateKey > existing["Ultima Fecha Renovacion"]) {
          existing["Ultima Fecha Renovacion"] = item.dateKey;
        }
        existing["Historial Folios"].push(folioLabel);
      } else {
        byUserMap.set(key, {
          "Usuario / Cliente": item.credit.client.fullName,
          "Cedula / ID": item.credit.client.identification || item.credit.client.clientNumber || "-",
          Telefono: item.credit.client.phone || "-",
          Direccion: item.credit.client.address,
          Zona: item.credit.zone.name,
          Operador: item.operatorName,
          "Veces que Renovo": 1,
          "Dinero Total Renovado ($)": item.principalRenewed,
          "Total con Interes ($)": item.totalRenewed,
          "Ultima Fecha Renovacion": item.dateKey,
          "Historial Folios": [folioLabel],
        });
      }
    }

    const byUserRows = Array.from(byUserMap.values()).map((row) => ({
      ...row,
      "Historial Folios": row["Historial Folios"].join(" | "),
    }));

    // 3. Por Usuario Operador y Zona
    const byOperatorMap = new Map<
      string,
      {
        "Usuario Operador": string;
        Zona: string;
        "Cantidad Renovaciones": number;
        "Dinero Renovado Capital ($)": number;
        "Total con Interes ($)": number;
      }
    >();

    for (const item of renewalItems) {
      const key = `${item.operatorName}__${item.credit.zone.name}`;
      const existing = byOperatorMap.get(key);
      if (existing) {
        existing["Cantidad Renovaciones"] += 1;
        existing["Dinero Renovado Capital ($)"] += item.principalRenewed;
        existing["Total con Interes ($)"] += item.totalRenewed;
      } else {
        byOperatorMap.set(key, {
          "Usuario Operador": item.operatorName,
          Zona: item.credit.zone.name,
          "Cantidad Renovaciones": 1,
          "Dinero Renovado Capital ($)": item.principalRenewed,
          "Total con Interes ($)": item.totalRenewed,
        });
      }
    }

    const byOperatorRows = Array.from(byOperatorMap.values());

    // 4. Detalle de cada renovacion
    const detailRows = renewalItems.map((item) => ({
      "Fecha Renovacion": item.dateKey,
      "Folio Nuevo": item.credit.creditNumber ? `#${item.credit.creditNumber}` : "-",
      "Folio Anterior": item.previousCredit?.creditNumber
        ? `#${item.previousCredit.creditNumber}`
        : "-",
      "Usuario / Cliente": item.credit.client.fullName,
      Telefono: item.credit.client.phone || "-",
      Zona: item.credit.zone.name,
      "Usuario Operador": item.operatorName,
      "Monto Credito Anterior ($)": item.previousCredit
        ? Math.round(Number(item.previousCredit.principalAmount))
        : 0,
      "Dinero Renovado Capital ($)": item.principalRenewed,
      "Interes ($)": item.interestRenewed,
      "Total Nuevo a Pagar ($)": item.totalRenewed,
      "Valor Cuota ($)": Math.round(Number(item.credit.installmentAmount)),
      "Total Cuotas": item.credit.installmentCount,
      "Dia de Cobro": collectionDayLabel(
        item.credit.type,
        item.credit.weeklyCollectionDay,
        item.credit.startDate,
      ),
      Estatus:
        item.credit.status === "settled"
          ? "Liquidado"
          : item.credit.status === "delinquent"
            ? "Con atraso"
            : "Activo",
    }));

    addSheet(workbook, "Por Dia (Dinero Renovado)", byDayRows);
    addSheet(workbook, "Por Usuario (Clientes)", byUserRows);
    addSheet(workbook, "Por Operador y Zona", byOperatorRows);
    addSheet(workbook, "Detalle Renovaciones", detailRows);

    return workbookResponse(workbook, `renovaciones-${dateLabel(today)}.xlsx`);
  }

  if (type === "pagos") {
    const from = parseDate(searchParams.get("desde"), today);
    const to = parseDate(searchParams.get("hasta"), today);
    const toExclusive = addDaysUtc(to, 1);
    const payments = await prisma.payment.findMany({
      where: {
        cancelledAt: null,
        paymentDate: {
          gte: from,
          lt: toExclusive,
        },
      },
      include: {
        client: true,
        credit: { include: { zone: true } },
        allocations: { include: { installment: true } },
      },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
    });

    addSheet(
      workbook,
      "Pagos",
      payments.map((payment) => {
        const ordinaryApplied = payment.allocations.reduce(
          (total, allocation) => total + Number(allocation.amountApplied),
          0,
        );
        const lateFeeApplied = payment.allocations.reduce(
          (total, allocation) => total + Number(allocation.lateFeeApplied),
          0,
        );
        return {
          Fecha: dateLabel(payment.paymentDate),
          "Folio Credito": payment.credit.creditNumber ? `#${payment.credit.creditNumber}` : "-",
          Cliente: payment.client.fullName,
          Telefono: payment.client.phone || "-",
          Direccion: payment.client.address,
          Zona: payment.credit.zone.name,
          Credito:
            payment.credit.type === "daily"
              ? "Diario"
              : payment.credit.type === "biweekly"
                ? "Quincenal"
                : "Semanal",
          "Abonado a Cuotas": Math.round(ordinaryApplied),
          "Mora Pagada": Math.round(lateFeeApplied),
          "Total Pagado": Math.round(Number(payment.amount)),
          Metodo: payment.method,
          "Cuotas Aplicadas": payment.allocations
            .map((allocation) => `#${allocation.installment.installmentNumber}`)
            .join(", "),
        };
      }),
    );

    return workbookResponse(workbook, `pagos-${dateLabel(from)}-${dateLabel(to)}.xlsx`);
  }

  // Active credits report (includes both active and delinquent credits, and those with overdue installments)
  if (type === "activos") {
    const activeCredits = await prisma.credit.findMany({
      where: {
        status: { in: ["active", "delinquent"] },
        ...(zoneFilter !== "all" ? { zoneId: zoneFilter } : {}),
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
    });

    const allRows = activeCredits.map((credit) => buildDetailedCreditRow(credit, today));
    const overdueRows = allRows.filter((row) => row["Pagos Atrasados"] > 0);

    addSheet(workbook, "Creditos Activos (Todos)", allRows);
    addSheet(workbook, "Activos con Atraso", overdueRows);

    const byZone = new Map<string, typeof allRows>();
    for (const row of allRows) {
      const z = row.Zona;
      byZone.set(z, [...(byZone.get(z) ?? []), row]);
    }
    for (const [zoneName, rows] of Array.from(byZone.entries())) {
      addSheet(workbook, `Zona ${zoneName}`, rows);
    }

    addSheet(workbook, "Resumen Activos", [
      {
        "Fecha de Corte": dateLabel(today),
        "Total Creditos Activos": allRows.length,
        "Creditos Al Corriente": allRows.length - overdueRows.length,
        "Creditos Con Atraso": overdueRows.length,
        "Capital Prestado Activo ($)": allRows.reduce((s, r) => s + r["Capital Prestado"], 0),
        "Total a Pagar Pactado ($)": allRows.reduce((s, r) => s + r["Total a Pagar"], 0),
        "Abonado a Cuotas ($)": allRows.reduce((s, r) => s + r["Abonado a Cuotas ($)"], 0),
        "Mora Pagada Total ($)": allRows.reduce((s, r) => s + r["Mora Pagada ($)"], 0),
        "Saldo Pendiente por Recuperar ($)": allRows.reduce((s, r) => s + r["Saldo Pendiente ($)"], 0),
        "Monto Total en Atraso ($)": allRows.reduce((s, r) => s + r["Monto Atrasado"], 0),
      },
    ]);

    return workbookResponse(workbook, `creditos-activos-${dateLabel(today)}.xlsx`);
  }

  const credits = await prisma.credit.findMany({
    where: {
      status: { not: "cancelled" },
      ...(zoneFilter !== "all" ? { zoneId: zoneFilter } : {}),
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
    orderBy: [{ zone: { name: "asc" } }, { type: "asc" }, { createdAt: "desc" }],
  });

  if (type === "mora") {
    const activeWithOverdue = credits
      .filter((credit) => ["active", "delinquent"].includes(credit.status))
      .map((credit) => buildDetailedCreditRow(credit, today))
      .filter((row) => row["Pagos Atrasados"] > 0);

    const overdueInstallmentRows = credits.flatMap((credit) =>
      credit.installments
        .filter(
          (installment) =>
            new Date(installment.dueDate).getTime() < today.getTime() &&
            ["pending", "partial", "overdue"].includes(installment.status),
        )
        .map((installment) => ({
          "Folio Credito": credit.creditNumber ? `#${credit.creditNumber}` : "-",
          Cliente: credit.client.fullName,
          Telefono: credit.client.phone || "-",
          Direccion: credit.client.address,
          Zona: credit.zone.name,
          "Fecha de Otorgamiento": dateLabel(credit.startDate),
          Credito:
            credit.type === "daily"
              ? "Diario"
              : credit.type === "biweekly"
                ? "Quincenal"
                : "Semanal",
          "Numero de Cuota": installment.installmentNumber,
          "Fecha Vencimiento Cuota": dateLabel(installment.dueDate),
          "Monto Cuota": Math.round(Number(installment.scheduledAmount)),
          Mora: Math.round(Number(installment.lateFeeAmount)),
          "Abonado a Cuota": Math.round(
            Math.min(Number(installment.paidAmount), Number(installment.scheduledAmount)),
          ),
          "Mora Pagada": Math.round(
            Math.max(Number(installment.paidAmount) - Number(installment.scheduledAmount), 0),
          ),
          "Saldo Cuota": Math.round(
            Math.max(
              Number(installment.scheduledAmount) +
                Number(installment.lateFeeAmount) -
                Number(installment.paidAmount),
              0,
            ),
          ),
        })),
    );

    addSheet(workbook, "Creditos con Atraso", activeWithOverdue);
    addSheet(workbook, "Detalle Cuotas Vencidas", overdueInstallmentRows);
    return workbookResponse(workbook, `mora-${dateLabel(today)}.xlsx`);
  }

  if (type === "ganancias") {
    const rows = credits.map((credit) => {
      const detailed = buildDetailedCreditRow(credit, today);
      const interestCollected = credit.installments.reduce((total, installment) => {
        const scheduled = Number(installment.scheduledAmount);
        if (scheduled <= 0) return total;
        const ordinaryPaid = Math.min(Number(installment.paidAmount), scheduled);
        return total + ordinaryPaid * (Number(installment.interestComponent) / scheduled);
      }, 0);

      return {
        "Folio Credito": detailed["Folio Credito"],
        Cliente: detailed.Cliente,
        Zona: detailed.Zona,
        "Fecha de Otorgamiento": detailed["Fecha de Otorgamiento"],
        Capital: detailed["Capital Prestado"],
        "Interes pactado": detailed["Interes / Financiamiento"],
        "Interes cobrado": Math.round(interestCollected),
        "Pagos Hechos": detailed["Pagos Hechos"],
        "Pagos Atrasados": detailed["Pagos Atrasados"],
        "Abonado a Cuotas ($)": detailed["Abonado a Cuotas ($)"],
        "Mora Pagada ($)": detailed["Mora Pagada ($)"],
        "Saldo Pendiente ($)": detailed["Saldo Pendiente ($)"],
        Estatus: detailed.Estatus,
      };
    });

    addSheet(workbook, "Ganancias", rows);
    addSheet(workbook, "Resumen", [
      {
        "Capital prestado": credits.reduce(
          (total, credit) => total + Math.round(Number(credit.principalAmount)),
          0,
        ),
        "Interes pactado": credits.reduce(
          (total, credit) => total + Math.round(Number(credit.interestAmount)),
          0,
        ),
        "Abonado a cuotas": rows.reduce((total, row) => total + row["Abonado a Cuotas ($)"], 0),
        "Mora pagada": rows.reduce((total, row) => total + row["Mora Pagada ($)"], 0),
        "Saldo cartera": rows.reduce((total, row) => total + row["Saldo Pendiente ($)"], 0),
      },
    ]);
    return workbookResponse(workbook, `ganancias-${dateLabel(today)}.xlsx`);
  }

  // Default: "cartera"
  const allDetailedRows = credits.map((credit) => buildDetailedCreditRow(credit, today));
  addSheet(workbook, "Cartera General", allDetailedRows);

  const groups = new Map<string, typeof allDetailedRows>();
  for (const row of allDetailedRows) {
    const key = `${row.Zona} - ${row.Frecuencia}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  for (const [name, groupRows] of Array.from(groups.entries())) {
    addSheet(workbook, name, groupRows);
  }

  addSheet(workbook, "Resumen", [
    {
      "Creditos exportados": credits.length,
      "Saldo total": formatCurrency(allDetailedRows.reduce((total, row) => total + row["Saldo Pendiente ($)"], 0)),
      "Mora pagada total": formatCurrency(allDetailedRows.reduce((total, row) => total + row["Mora Pagada ($)"], 0)),
      Fecha: dateLabel(today),
    },
  ]);

  return workbookResponse(workbook, `cartera-${dateLabel(today)}.xlsx`);
}

