import { prisma } from "@/lib/prisma";

export async function getPaymentFormData(creditId: string) {
  return prisma.credit.findUnique({
    where: { id: creditId },
    include: {
      client: true,
      zone: true,
      installments: {
        where: {
          status: {
            in: ["pending", "partial", "overdue"],
          },
        },
        orderBy: {
          installmentNumber: "asc",
        },
      },
    },
  });
}

export async function getPaymentReceipt(paymentId: string) {
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      client: true,
      credit: {
        include: {
          zone: true,
          installments: true,
          payments: {
            where: {
              cancelledAt: null,
            },
            include: {
              allocations: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
      allocations: {
        include: {
          installment: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}
