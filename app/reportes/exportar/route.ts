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
    }>;
  },
  today: Date,
) {
  const sortedInstallments = [...credit.installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber,
  );
  const totalPaid = sortedInstallments.reduce(
    (sum, inst) => sum + Number(inst.paidAmount),
    0,
  );
  const pendingSaldo = balance(sortedInstallments);
  const installmentAmt = Number(credit.installmentAmount) || 1;
  const exactPaidInstallments = Number((totalPaid / installmentAmt).toFixed(1));
  const fullPaidCount = sortedInstallments.filter((inst) => inst.status === "paid").length;

  const overdueInstallments = sortedInstallments.filter(
    (inst) =>
      new Date(inst.dueDate).getTime() < today.getTime() &&
      ["pending", "partial", "overdue"].includes(inst.status) &&
      Number(inst.scheduledAmount) + Number(inst.lateFeeAmount) - Number(inst.paidAmount) > 0.01,
  );
  const overdueCount = overdueInstallments.length;
  const overdueAmount = balance(overdueInstallments);

  const pendingInstallmentsCount = Math.max(credit.installmentCount - fullPaidCount, 0);
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
    "Capital Prestado": Number(credit.principalAmount),
    "Tasa Interes (%)": Number((Number(credit.interestRate) * 100).toFixed(2)),
    "Interes / Financiamiento": Number(credit.interestAmount),
    "Total a Pagar": Number(credit.totalAmount),
    "Valor Cuota": Number(credit.installmentAmount),
    "Total Cuotas": credit.installmentCount,
    "Pagos Hechos (Cuotas)": exactPaidInstallments,
    "Cuotas Completas Pagadas": fullPaidCount,
    "Cuotas Pendientes": pendingInstallmentsCount,
    "Pagos Atrasados (Cuotas)": overdueCount,
    "Monto Atrasado": Number(overdueAmount.toFixed(2)),
    "Total Abonado ($)": Number(totalPaid.toFixed(2)),
    "Saldo Pendiente ($)": Number(pendingSaldo.toFixed(2)),
    "Fecha Ultimo Pago": lastPayment ? dateLabel(lastPayment.paymentDate) : "Sin pagos",
    "Monto Ultimo Pago": lastPayment ? Number(lastPayment.amount) : 0,
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
      payments.map((payment) => ({
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
        Monto: Number(payment.amount),
        Metodo: payment.method,
        "Cuotas Aplicadas": payment.allocations
          .map((allocation) => `#${allocation.installment.installmentNumber}`)
          .join(", "),
        Mora: payment.allocations.reduce(
          (total, allocation) => total + Number(allocation.lateFeeApplied),
          0,
        ),
      })),
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
        payments: { where: { cancelledAt: null }, orderBy: { paymentDate: "desc" } },
      },
      orderBy: [{ zone: { name: "asc" } }, { creditNumber: "asc" }],
    });

    const allRows = activeCredits.map((credit) => buildDetailedCreditRow(credit, today));
    const overdueRows = allRows.filter((row) => row["Pagos Atrasados (Cuotas)"] > 0);

    addSheet(workbook, "Creditos Activos (Todos)", allRows);
    addSheet(workbook, "Activos con Atraso", overdueRows);

    // Also add one sheet per zone for easy field printing
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
        "Total Abonado ($)": allRows.reduce((s, r) => s + r["Total Abonado ($)"], 0),
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
      payments: { where: { cancelledAt: null }, orderBy: { paymentDate: "desc" } },
    },
    orderBy: [{ zone: { name: "asc" } }, { type: "asc" }, { createdAt: "desc" }],
  });

  if (type === "mora") {
    const activeWithOverdue = credits
      .filter((credit) => ["active", "delinquent"].includes(credit.status))
      .map((credit) => buildDetailedCreditRow(credit, today))
      .filter((row) => row["Pagos Atrasados (Cuotas)"] > 0);

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
          "Monto Cuota": Number(installment.scheduledAmount),
          Mora: Number(installment.lateFeeAmount),
          "Abonado a Cuota": Number(installment.paidAmount),
          "Saldo Cuota": Math.max(
            Number(installment.scheduledAmount) +
              Number(installment.lateFeeAmount) -
              Number(installment.paidAmount),
            0,
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
        "Interes cobrado": Number(interestCollected.toFixed(2)),
        "Pagos Hechos (Cuotas)": detailed["Pagos Hechos (Cuotas)"],
        "Pagos Atrasados (Cuotas)": detailed["Pagos Atrasados (Cuotas)"],
        Pagado: detailed["Total Abonado ($)"],
        Saldo: detailed["Saldo Pendiente ($)"],
        Estatus: detailed.Estatus,
      };
    });

    addSheet(workbook, "Ganancias", rows);
    addSheet(workbook, "Resumen", [
      {
        "Capital prestado": credits.reduce((total, credit) => total + Number(credit.principalAmount), 0),
        "Interes pactado": credits.reduce((total, credit) => total + Number(credit.interestAmount), 0),
        "Total cobrado": credits.reduce(
          (total, credit) =>
            total + credit.payments.reduce((paymentTotal, payment) => paymentTotal + Number(payment.amount), 0),
          0,
        ),
        "Saldo cartera": credits.reduce((total, credit) => total + balance(credit.installments), 0),
      },
    ]);
    return workbookResponse(workbook, `ganancias-${dateLabel(today)}.xlsx`);
  }

  // Default: "cartera" (all non-cancelled credits, plus full detail sheet)
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
      "Saldo total": formatCurrency(credits.reduce((total, credit) => total + balance(credit.installments), 0)),
      Fecha: dateLabel(today),
    },
  ]);

  return workbookResponse(workbook, `cartera-${dateLabel(today)}.xlsx`);
}
