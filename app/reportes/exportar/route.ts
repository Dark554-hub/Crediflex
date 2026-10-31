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

function dateLabel(date: Date) {
  return date.toISOString().slice(0, 10);
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

export async function GET(request: NextRequest) {
  await syncAutomaticLateFees();

  const today = todayInMexicoAsUtcDate();
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("tipo") ?? "cartera";
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
        Cliente: payment.client.fullName,
        Zona: payment.credit.zone.name,
        Credito: payment.credit.type === "daily" ? "Diario" : payment.credit.type === "biweekly" ? "Quincenal" : "Semanal",
        Monto: Number(payment.amount),
        Metodo: payment.method,
        Cuotas: payment.allocations.map((allocation) => allocation.installment.installmentNumber).join(", "),
        Mora: payment.allocations.reduce((total, allocation) => total + Number(allocation.lateFeeApplied), 0),
      })),
    );

    return workbookResponse(workbook, `pagos-${dateLabel(from)}-${dateLabel(to)}.xlsx`);
  }

  const credits = await prisma.credit.findMany({
    where: { status: { not: "cancelled" } },
    include: {
      client: true,
      zone: true,
      installments: true,
      payments: { where: { cancelledAt: null } },
    },
    orderBy: [{ zone: { name: "asc" } }, { type: "asc" }, { createdAt: "desc" }],
  });

  if (type === "mora") {
    const overdueRows = credits.flatMap((credit) =>
      credit.installments
        .filter((installment) => installment.dueDate < today && ["pending", "partial", "overdue"].includes(installment.status))
        .map((installment) => ({
          Cliente: credit.client.fullName,
          Zona: credit.zone.name,
          Credito: credit.type === "daily" ? "Diario" : credit.type === "biweekly" ? "Quincenal" : "Semanal",
          Pago: installment.installmentNumber,
          Vencimiento: dateLabel(installment.dueDate),
          "Monto cuota": Number(installment.scheduledAmount),
          Mora: Number(installment.lateFeeAmount),
          Pagado: Number(installment.paidAmount),
          Saldo: Math.max(
            Number(installment.scheduledAmount) +
              Number(installment.lateFeeAmount) -
              Number(installment.paidAmount),
            0,
          ),
        })),
    );

    addSheet(workbook, "Mora", overdueRows);
    return workbookResponse(workbook, `mora-${dateLabel(today)}.xlsx`);
  }

  if (type === "ganancias") {
    const rows = credits.map((credit) => {
      const paid = credit.installments.reduce((total, installment) => total + Number(installment.paidAmount), 0);
      const interestCollected = credit.installments.reduce((total, installment) => {
        const scheduled = Number(installment.scheduledAmount);
        if (scheduled <= 0) return total;
        const ordinaryPaid = Math.min(Number(installment.paidAmount), scheduled);
        return total + ordinaryPaid * (Number(installment.interestComponent) / scheduled);
      }, 0);

      return {
        Cliente: credit.client.fullName,
        Zona: credit.zone.name,
        Capital: Number(credit.principalAmount),
        "Interes pactado": Number(credit.interestAmount),
        "Interes cobrado": interestCollected,
        Pagado: paid,
        Saldo: balance(credit.installments),
        Estatus: credit.status,
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

  const groups = new Map<string, typeof credits>();
  for (const credit of credits) {
    const key = `${credit.zone.name} - ${credit.type === "daily" ? "Diario" : credit.type === "biweekly" ? "Quincenal" : "Semanal"}`;
    groups.set(key, [...(groups.get(key) ?? []), credit]);
  }

  for (const [name, groupCredits] of Array.from(groups.entries())) {
    addSheet(
      workbook,
      name,
      groupCredits.map((credit) => {
        const paid = credit.installments.reduce((total, installment) => total + Number(installment.paidAmount), 0);
        const overdueCount = credit.installments.filter(
          (installment) => installment.dueDate < today && ["pending", "partial", "overdue"].includes(installment.status),
        ).length;

        return {
          Cliente: credit.client.fullName,
          Prestamo: Number(credit.principalAmount),
          "Pago periodico": Number(credit.installmentAmount),
          "# Pagos": credit.installmentCount,
          Financiamiento: Number(credit.interestAmount),
          "Pagos realizados": credit.installments.filter((installment) => installment.status === "paid").length,
          "Pagos vencidos": overdueCount,
          Pagado: paid,
          Saldo: balance(credit.installments),
          Estatus: credit.status,
          "Inicio": dateLabel(credit.startDate),
          "Vencimiento": dateLabel(credit.expectedEndDate),
        };
      }),
    );
  }

  addSheet(workbook, "Resumen", [
    {
      "Creditos exportados": credits.length,
      "Saldo total": formatCurrency(credits.reduce((total, credit) => total + balance(credit.installments), 0)),
      "Fecha": dateLabel(today),
    },
  ]);

  return workbookResponse(workbook, `cartera-${dateLabel(today)}.xlsx`);
}
