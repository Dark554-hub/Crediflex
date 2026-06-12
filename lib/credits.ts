import { CreditStatus, CreditType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncAutomaticLateFees } from "@/lib/late-fees";

export type CreditFilters = {
  query?: string;
  zoneId?: string;
  type?: CreditType | "all";
  status?: CreditStatus | "all" | "open";
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
  await syncAutomaticLateFees();

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
      installments: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCreditById(id: string) {
  await syncAutomaticLateFees();

  return prisma.credit.findUnique({
    where: { id },
    include: {
      client: true,
      zone: true,
      installments: {
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
  });
}
