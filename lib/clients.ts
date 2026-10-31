import { ClientStatus, Prisma } from "@prisma/client";
import { calculatePaymentEffectiveness, InstallmentForEffectiveness } from "@/lib/effectiveness";
import { prisma } from "@/lib/prisma";

export type ClientFilters = {
  query?: string;
  zoneId?: string;
  status?: ClientStatus | "all";
  /** Maximo de clientes a devolver. Se pide uno extra para saber si hay mas. */
  limit?: number;
};

let cachedZones: { data: any[]; timestamp: number } | null = null;

export async function getZones() {
  if (cachedZones && Date.now() - cachedZones.timestamp < 60000) {
    return cachedZones.data;
  }
  const data = await prisma.zone.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  cachedZones = { data, timestamp: Date.now() };
  return data;
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
    take: filters.limit ? filters.limit + 1 : undefined,
  });
}

export async function getClientById(id: string) {
  // Consulta liviana: solo los campos que usa el perfil (antes traia todas las columnas
  // de cuotas, pagos y asignaciones, lo que hacia lenta la carga con muchos creditos).
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
            select: {
              id: true,
              installmentNumber: true,
              dueDate: true,
              scheduledAmount: true,
              lateFeeAmount: true,
              paidAmount: true,
              status: true,
              allocations: {
                select: {
                  amountApplied: true,
                  lateFeeApplied: true,
                  payment: { select: { paymentDate: true } },
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
    credits: client.credits.map((credit) => ({
      ...credit,
      paymentEffectiveness: calculatePaymentEffectiveness(credit.installments),
    })),
    paymentEffectiveness: calculatePaymentEffectiveness(
      client.credits.flatMap((credit) => credit.installments),
    ),
  };
}
