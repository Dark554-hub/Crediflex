import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { todayInMexicoAsUtcDate } from "@/lib/dates";

function daysBetweenUtcDates(from: Date, to: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((toUtc - fromUtc) / msPerDay);
}

function calculateLateFee(input: {
  dueDate: Date;
  scheduledAmount: unknown;
  paidAmount: unknown;
  credit: {
    lateFeeAmount: unknown;
    lateFeeRate: unknown;
    lateFeeGraceDays: number;
  };
}) {
  const today = todayInMexicoAsUtcDate();
  const daysPastDue = daysBetweenUtcDates(input.dueDate, today);
  const chargeableDays = Math.max(daysPastDue - input.credit.lateFeeGraceDays, 0);
  const ordinaryPending = Math.max(Number(input.scheduledAmount) - Number(input.paidAmount), 0);

  if (chargeableDays <= 0 || ordinaryPending <= 0) {
    return 0;
  }

  // Formula de mora:
  // dias_con_mora = dias vencidos - dias de gracia.
  // mora = cargo fijo configurado + (saldo ordinario pendiente * tasa diaria de mora * dias_con_mora).
  // Se usa el saldo ordinario pendiente para no cobrar mora sobre pagos ya cubiertos.
  return Number(input.credit.lateFeeAmount) + ordinaryPending * Number(input.credit.lateFeeRate) * chargeableDays;
}

export async function syncAutomaticLateFees() {
  const today = todayInMexicoAsUtcDate();
  const installments = await prisma.creditInstallment.findMany({
    where: {
      dueDate: { lt: today },
      status: { in: ["pending", "partial", "overdue"] },
      credit: { status: { in: ["active", "delinquent"] } },
    },
    include: {
      credit: true,
    },
  });

  const operations: Prisma.PrismaPromise<unknown>[] = [];
  const creditIds = new Set<string>();
  const clientIds = new Set<string>();

  for (const installment of installments) {
    const lateFeeAmount = calculateLateFee(installment);
    const currentLateFee = Number(installment.lateFeeAmount);

    creditIds.add(installment.creditId);
    clientIds.add(installment.credit.clientId);

    if (installment.status !== "overdue" || Math.abs(currentLateFee - lateFeeAmount) >= 0.01) {
      operations.push(
        prisma.creditInstallment.update({
          where: { id: installment.id },
          data: {
            status: "overdue",
            lateFeeAmount: lateFeeAmount.toFixed(2),
          },
        }),
      );
    }
  }

  if (creditIds.size > 0) {
    operations.push(
      prisma.credit.updateMany({
        where: {
          id: { in: Array.from(creditIds) },
          status: "active",
        },
        data: {
          status: "delinquent",
        },
      }),
    );
  }

  if (clientIds.size > 0) {
    operations.push(
      prisma.client.updateMany({
        where: {
          id: { in: Array.from(clientIds) },
          status: "active",
        },
        data: {
          status: "delinquent",
        },
      }),
    );
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }
}
