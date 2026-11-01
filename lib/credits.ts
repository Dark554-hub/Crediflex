import { CreditStatus, CreditType, Prisma } from "@prisma/client";
import { calculatePaymentEffectiveness } from "@/lib/effectiveness";
import { prisma } from "@/lib/prisma";
import { syncAutomaticLateFees } from "@/lib/late-fees";

export type CreditFilters = {
  query?: string;
  zoneId?: string;
  type?: CreditType | "all";
  status?: CreditStatus | "all" | "open";
  /** Maximo de creditos a devolver. Se pide uno extra para saber si hay mas. */
  limit?: number;
};

export async function getCreditFormData(renewCreditId?: string) {
  const [clients, zones, renewalCredit] = await Promise.all([
    prisma.client.findMany({
      where: {
        deletedAt: null,
        status: {
          not: "inactive",
        },
      },
      include: {
        zone: true,
      },
      orderBy: {
        fullName: "asc",
      },
    }),
    prisma.zone.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    renewCreditId
      ? prisma.credit.findUnique({
          where: { id: renewCreditId },
          include: {
            client: {
              include: {
                zone: true,
              },
            },
          },
        })
      : null,
  ]);

  return { clients, zones, renewalCredit };
}

export async function getCredits(filters: CreditFilters) {
  void syncAutomaticLateFees();

  const where: Prisma.CreditWhereInput = {};

  if (filters.query) {
    where.client = {
      fullName: {
        contains: filters.query,
        mode: "insensitive",
      },
    };
  }

  if (filters.zoneId && filters.zoneId !== "all") {
    where.zoneId = filters.zoneId;
  }

  if (filters.type && filters.type !== "all") {
    where.type = filters.type;
  }

  if (!filters.status || filters.status === "open") {
    where.status = {
      in: ["active", "delinquent"],
    };
  } else if (filters.status !== "all") {
    where.status = filters.status;
  }

  return prisma.credit.findMany({
    where,
    include: {
      client: true,
      zone: true,
      _count: {
        select: {
          installments: { where: { status: "paid" } },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: filters.limit ? filters.limit + 1 : undefined,
  });
}

export async function getCreditById(id: string) {
  void syncAutomaticLateFees();

  const [credit, zones] = await Promise.all([
    prisma.credit.findUnique({
      where: { id },
      include: {
        client: true,
        zone: true,
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
        payments: {
          where: {
            cancelledAt: null,
          },
          include: {
            allocations: {
              include: {
                installment: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        agreements: {
          orderBy: {
            promisedPaymentDate: "asc",
          },
        },
      },
    }),
    prisma.zone.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!credit) return null;

  return {
    ...credit,
    zones,
    paymentEffectiveness: calculatePaymentEffectiveness(credit.installments),
  };
}
