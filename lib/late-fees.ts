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

const SYNC_TTL_MS = 30 * 60 * 1000;

export async function syncAutomaticLateFees() {
  const today = todayInMexicoAsUtcDate();
  const dateKey = today.toISOString().slice(0, 10);
  const now = Date.now();
  const state = globalForLateFees.lateFeeSync;

  if (state?.promise || (state?.dateKey === dateKey && now - state.syncedAt < SYNC_TTL_MS)) {
    return;
  }

  // Ejecución en segundo plano para no demorar la respuesta de las páginas
  const promise = runAutomaticLateFeeSync(today)
    .catch((err) => {
      console.error("[LateFees] Error en sync en segundo plano:", err);
    })
    .finally(() => {
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

  return;
}

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

  return Number(input.credit.lateFeeAmount) + ordinaryPending * Number(input.credit.lateFeeRate) * chargeableDays;
}

async function runAutomaticLateFeeSync(today: Date) {
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
