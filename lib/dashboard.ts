import { prisma } from "@/lib/prisma";
import { todayInMexicoAsUtcDate } from "@/lib/dates";
import { syncAutomaticLateFees } from "@/lib/late-fees";

function startOfTodayUtc() {
  return todayInMexicoAsUtcDate();
}

function addDaysUtc(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function installmentBalance(installment: {
  scheduledAmount: unknown;
  lateFeeAmount: unknown;
  paidAmount: unknown;
}) {
  // Saldo de cuota = cuota ordinaria + mora registrada - pagos aplicados.
  // Se limita a cero para evitar saldos negativos cuando una cuota ya fue cubierta.
  return Math.max(
    Number(installment.scheduledAmount) +
      Number(installment.lateFeeAmount) -
      Number(installment.paidAmount),
    0,
  );
}

export async function getHomeStats() {
  const today = startOfTodayUtc();
  const [dueToday, overdue, activeCredits, clients] = await Promise.all([
    prisma.creditInstallment.count({
      where: {
        dueDate: today,
        status: {
          in: ["pending", "partial", "overdue"],
        },
      },
    }),
    prisma.creditInstallment.count({
      where: {
        dueDate: {
          lt: today,
        },
        status: {
          in: ["pending", "partial", "overdue"],
        },
      },
    }),
    prisma.credit.count({
      where: {
        status: {
          in: ["active", "delinquent"],
        },
      },
    }),
    prisma.client.count({
      where: {
        deletedAt: null,
      },
    }),
  ]);

  return { dueToday, overdue, activeCredits, clients };
}

export type DashboardData = {
  today: Date;
  activePrincipal: number;
  collectedToday: number;
  pendingToday: number;
  overdueAmount: number;
  delinquentClients: number;
  interestCollected: number;
  portfolioBalance: number;
  activeCount: number;
  settledCount: number;
  paymentCountToday: number;
  dueTodayCount: number;
  overdueCount: number;
  zoneCollections: Array<{ zoneId: string; name: string; collected: number; expected: number }>;
  installmentsToday: any[];
  overdueInstallments: any[];
  upcomingInstallments: any[];
};

let cachedDashboard: {
  data: DashboardData;
  timestamp: number;
} | null = null;

const DASHBOARD_CACHE_TTL_MS = 15000;

export function invalidateDashboardCache() {
  cachedDashboard = null;
}

export async function getDashboardData(): Promise<DashboardData> {
  if (cachedDashboard && Date.now() - cachedDashboard.timestamp < DASHBOARD_CACHE_TTL_MS) {
    return cachedDashboard.data;
  }

  void syncAutomaticLateFees();

  const today = startOfTodayUtc();
  const tomorrow = addDaysUtc(today, 1);
  const nextWeek = addDaysUtc(today, 7);

  const [
    activeCredits,
    paymentsToday,
    installmentsToday,
    overdueInstallments,
    allInstallments,
    zones,
    upcomingInstallments,
    creditCounts,
    paymentCountToday,
  ] = await Promise.all([
    prisma.credit.findMany({
      where: { status: { in: ["active", "delinquent"] } },
      select: { principalAmount: true },
    }),
    prisma.payment.findMany({
      where: { paymentDate: today, cancelledAt: null },
      select: { amount: true, credit: { select: { zoneId: true } } },
    }),
    prisma.creditInstallment.findMany({
      where: { dueDate: today, status: { in: ["pending", "partial", "overdue"] } },
      include: { credit: { include: { client: true, zone: true } } },
      orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
    }),
    prisma.creditInstallment.findMany({
      where: {
        dueDate: { lt: today },
        status: { in: ["pending", "partial", "overdue"] },
      },
      include: { credit: { include: { client: true, zone: true } } },
      orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
    }),
    prisma.creditInstallment.findMany({
      where: { credit: { status: { not: "cancelled" } } },
      select: {
        scheduledAmount: true,
        principalComponent: true,
        interestComponent: true,
        lateFeeAmount: true,
        paidAmount: true,
      },
    }),
    prisma.zone.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.creditInstallment.findMany({
      where: {
        dueDate: { gte: tomorrow, lte: nextWeek },
        status: { in: ["pending", "partial", "overdue"] },
      },
      include: { credit: { include: { client: true, zone: true } } },
      orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
      take: 6,
    }),
    prisma.credit.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.payment.count({ where: { paymentDate: today, cancelledAt: null } }),
  ]);

  const activePrincipal = activeCredits.reduce((total, credit) => total + Number(credit.principalAmount), 0);
  const collectedToday = paymentsToday.reduce((total, payment) => total + Number(payment.amount), 0);
  const pendingToday = installmentsToday.reduce((total, installment) => total + installmentBalance(installment), 0);
  const overdueAmount = overdueInstallments.reduce((total, installment) => total + installmentBalance(installment), 0);
  const delinquentClients = new Set(overdueInstallments.map((installment) => installment.credit.clientId)).size;

  // Interes cobrado estimado = pago ordinario de cada cuota * proporcion de interes de esa cuota.
  // Esto permite reportar ganancias aun con pagos parciales sin inventar saldos hardcodeados.
  const interestCollected = allInstallments.reduce((total, installment) => {
    const scheduled = Number(installment.scheduledAmount);
    if (scheduled <= 0) return total;
    const ordinaryPaid = Math.min(Number(installment.paidAmount), scheduled);
    return total + ordinaryPaid * (Number(installment.interestComponent) / scheduled);
  }, 0);

  const portfolioBalance = allInstallments.reduce((total, installment) => total + installmentBalance(installment), 0);

  const zoneCollections = zones.map((zone) => ({
    zoneId: zone.id,
    name: zone.name,
    collected: paymentsToday
      .filter((payment) => payment.credit.zoneId === zone.id)
      .reduce((total, payment) => total + Number(payment.amount), 0),
    expected: installmentsToday
      .filter((installment) => installment.credit.zoneId === zone.id)
      .reduce((total, installment) => total + installmentBalance(installment), 0),
  }));

  const result = {
    today,
    activePrincipal,
    collectedToday,
    pendingToday,
    overdueAmount,
    delinquentClients,
    interestCollected,
    portfolioBalance,
    activeCount: creditCounts.find((item) => item.status === "active")?._count._all ?? 0,
    settledCount: creditCounts.find((item) => item.status === "settled")?._count._all ?? 0,
    paymentCountToday,
    dueTodayCount: installmentsToday.length,
    overdueCount: overdueInstallments.length,
    zoneCollections,
    installmentsToday: installmentsToday.slice(0, 5),
    overdueInstallments: overdueInstallments.slice(0, 5),
    upcomingInstallments,
  };

  cachedDashboard = {
    data: result,
    timestamp: Date.now(),
  };

  return result;
}

export async function getInstallmentsForToday() {
  const today = startOfTodayUtc();

  return prisma.creditInstallment.findMany({
    where: {
      dueDate: today,
      status: {
        in: ["pending", "partial", "overdue"],
      },
    },
    include: {
      credit: {
        include: {
          client: true,
          zone: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
  });
}

export async function getOverdueInstallments() {
  await syncAutomaticLateFees();

  const today = startOfTodayUtc();

  return prisma.creditInstallment.findMany({
    where: {
      dueDate: {
        lt: today,
      },
      status: {
        in: ["pending", "partial", "overdue"],
      },
    },
    include: {
      credit: {
        include: {
          client: true,
          zone: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
  });
}

export async function getGeneralStats() {
  const today = startOfTodayUtc();
  const [credits, payments, pendingInstallments] = await Promise.all([
    prisma.credit.findMany({
      where: {
        status: {
          not: "cancelled",
        },
      },
      select: {
        principalAmount: true,
        interestAmount: true,
        totalAmount: true,
        status: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        cancelledAt: null,
      },
      select: {
        amount: true,
      },
    }),
    prisma.creditInstallment.findMany({
      where: {
        dueDate: { lte: today },
        status: { in: ["pending", "partial", "overdue"] },
        credit: { status: { in: ["active", "delinquent"] } },
      },
      select: {
        credit: {
          select: {
            clientId: true,
          },
        },
      },
    }),
  ]);

  return {
    totalPrincipal: credits.reduce((total, credit) => total + Number(credit.principalAmount), 0),
    totalInterest: credits.reduce((total, credit) => total + Number(credit.interestAmount), 0),
    totalPortfolio: credits.reduce((total, credit) => total + Number(credit.totalAmount), 0),
    totalCollected: payments.reduce((total, payment) => total + Number(payment.amount), 0),
    activeCredits: credits.filter((credit) => credit.status === "active").length,
    settledCredits: credits.filter((credit) => credit.status === "settled").length,
    pendingAccounts: new Set(pendingInstallments.map((installment) => installment.credit.clientId)).size,
    pendingInstallments: pendingInstallments.length,
  };
}
