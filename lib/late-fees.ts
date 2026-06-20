import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { todayInMexicoAsUtcDate } from "@/lib/dates";

const globalForLateFees = globalThis as unknown as {
  lateFeeSync?: {
    dateKey: string;
    syncedAt: number;
    promise?: Promise<void>;
  };
};

const SYNC_TTL_MS = 5 * 60 * 1000;

function daysBetweenUtcDates(from: Date, to: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((toUtc - fromUtc) / msPerDay);
}

function addDaysUtc(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
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
  const dateKey = today.toISOString().slice(0, 10);
  const now = Date.now();
  const state = globalForLateFees.lateFeeSync;

  if (state?.promise) {
    return state.promise;
  }

  if (state?.dateKey === dateKey && now - state.syncedAt < SYNC_TTL_MS) {
    return;
  }

  const promise = runAutomaticLateFeeSync(today).finally(() => {
    globalForLateFees.lateFeeSync = {
      dateKey,
      syncedAt: Date.now(),
    };
  });

  globalForLateFees.lateFeeSync = {
    dateKey,
    syncedAt: now,
    promise,
  };

  return promise;
}

async function runAutomaticLateFeeSync(today: Date) {
  await carryForwardMissedInstallments(today);

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

async function carryForwardMissedInstallments(today: Date) {
  const missedInstallments = await prisma.creditInstallment.findMany({
    where: {
      dueDate: { lt: today },
      status: { in: ["pending", "partial", "overdue"] },
      credit: { status: { in: ["active", "delinquent"] } },
    },
    select: {
      creditId: true,
      installmentNumber: true,
      dueDate: true,
    },
    orderBy: [{ creditId: "asc" }, { dueDate: "asc" }, { installmentNumber: "asc" }],
  });

  const firstMissedByCredit = new Map<string, { installmentNumber: number; dueDate: Date }>();

  for (const installment of missedInstallments) {
    const current = firstMissedByCredit.get(installment.creditId);
    if (
      !current ||
      installment.dueDate < current.dueDate ||
      (installment.dueDate.getTime() === current.dueDate.getTime() &&
        installment.installmentNumber < current.installmentNumber)
    ) {
      firstMissedByCredit.set(installment.creditId, {
        installmentNumber: installment.installmentNumber,
        dueDate: installment.dueDate,
      });
    }
  }

  for (const [creditId, firstMissed] of Array.from(firstMissedByCredit.entries())) {
    const daysToMove = daysBetweenUtcDates(firstMissed.dueDate, today);
    if (daysToMove <= 0) continue;

    const installmentsToMove = await prisma.creditInstallment.findMany({
      where: {
        creditId,
        installmentNumber: { gte: firstMissed.installmentNumber },
        status: { in: ["pending", "partial", "overdue"] },
      },
      select: {
        id: true,
        dueDate: true,
        status: true,
      },
      orderBy: { installmentNumber: "asc" },
    });

    if (installmentsToMove.length === 0) continue;

    const operations: Prisma.PrismaPromise<unknown>[] = installmentsToMove.map((installment) =>
      prisma.creditInstallment.update({
        where: { id: installment.id },
        data: {
          dueDate: addDaysUtc(installment.dueDate, daysToMove),
          status: installment.status === "overdue" ? "pending" : installment.status,
        },
      }),
    );

    const lastDueDate = installmentsToMove.reduce<Date | null>((last, installment) => {
      const movedDate = addDaysUtc(installment.dueDate, daysToMove);
      return !last || movedDate > last ? movedDate : last;
    }, null);

    if (lastDueDate) {
      operations.push(
        prisma.credit.update({
          where: { id: creditId },
          data: {
            expectedEndDate: lastDueDate,
            status: "active",
            settledAt: null,
          },
        }),
      );
    }

    // Corrimiento automatico por fecha:
    // dias_a_mover = fecha_actual - primer_pago_pendiente_vencido.
    // Cada cuota pendiente desde ese pago se recorre los mismos dias para conservar
    // el orden del credito. Ejemplo: si el pago del martes no se cubre, el miercoles
    // ese pago queda para miercoles y los siguientes pagos se recorren un dia.
    await prisma.$transaction(operations);
  }
}
