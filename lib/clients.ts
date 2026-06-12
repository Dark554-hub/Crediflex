import { ClientStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ClientFilters = {
  query?: string;
  zoneId?: string;
  status?: ClientStatus | "all";
};

export async function getZones() {
  return prisma.zone.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getClients(filters: ClientFilters) {
  const where: Prisma.ClientWhereInput = {
    deletedAt: null,
  };

  if (filters.query) {
    where.fullName = {
      contains: filters.query,
      mode: "insensitive",
    };
  }

  if (filters.zoneId && filters.zoneId !== "all") {
    where.zoneId = filters.zoneId;
  }

  if (filters.status && filters.status !== "all") {
    where.status = filters.status;
  }

  return prisma.client.findMany({
    where,
    include: {
      zone: true,
      _count: {
        select: {
          credits: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { fullName: "asc" }],
  });
}

export async function getClientById(id: string) {
  const client = await prisma.client.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      zone: true,
      credits: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          installments: {
            include: {
              allocations: {
                include: {
                  payment: true,
                },
                orderBy: {
                  createdAt: "asc",
                },
              },
            },
            orderBy: {
              installmentNumber: "asc",
            },
          },
        },
      },
    },
  });

  if (!client) return null;

  return {
    ...client,
    paymentEffectiveness: calculateClientPaymentEffectiveness(client.credits),
  };
}

type CreditForEffectiveness = Awaited<ReturnType<typeof prisma.credit.findMany>>[number] & {
  installments: Array<{
    dueDate: Date;
    scheduledAmount: unknown;
    lateFeeAmount: unknown;
    paidAmount: unknown;
    status: string;
    allocations: Array<{
      amountApplied: unknown;
      lateFeeApplied: unknown;
      payment: {
        paymentDate: Date;
      };
    }>;
  }>;
};

function dateOnlyUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

function calculateClientPaymentEffectiveness(credits: CreditForEffectiveness[]) {
  const todayKey = dateOnlyUtc(new Date());
  const accruedInstallments = credits
    .flatMap((credit) => credit.installments)
    .filter((installment) => dateOnlyUtc(installment.dueDate) <= todayKey);

  const paidAccruedInstallments = accruedInstallments.filter((installment) => {
    const totalDue =
      Number(installment.scheduledAmount) +
      Number(installment.lateFeeAmount);
    return Number(installment.paidAmount) >= totalDue && installment.status === "paid";
  });

  const onTimeInstallments = paidAccruedInstallments.filter((installment) => {
    const dueKey = dateOnlyUtc(installment.dueDate);
    let accumulated = 0;

    for (const allocation of installment.allocations) {
      accumulated += Number(allocation.amountApplied) + Number(allocation.lateFeeApplied);
      const totalDue =
        Number(installment.scheduledAmount) +
        Number(installment.lateFeeAmount);

      // Pago en tiempo y forma:
      // la cuota cuenta como puntual solo si quedo totalmente cubierta
      // con pagos cuya fecha de pago es menor o igual a la fecha de vencimiento.
      if (accumulated >= totalDue) {
        return dateOnlyUtc(allocation.payment.paymentDate) <= dueKey;
      }
    }

    return false;
  });

  const accruedCount = accruedInstallments.length;
  const punctualityRate = accruedCount > 0 ? onTimeInstallments.length / accruedCount : 0;
  const accruedPaymentRate = accruedCount > 0 ? paidAccruedInstallments.length / accruedCount : 0;

  return {
    accruedCount,
    onTimeCount: onTimeInstallments.length,
    paidAccruedCount: paidAccruedInstallments.length,
    punctualityRate,
    accruedPaymentRate,
  };
}
