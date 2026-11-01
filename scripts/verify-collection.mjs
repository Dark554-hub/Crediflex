import { getOrCreateTodayCollection } from "../lib/collections.ts";
import { prisma } from "../lib/prisma.ts";

async function verify() {
  const today = await getOrCreateTodayCollection();
  console.log("Jornada:", today.collectionDate.toISOString().slice(0, 10));
  console.log("Total items en jornada:", today.items.length);
  console.log("Esperado:", today.totalExpected);
  console.log("Cobrado:", today.totalCollected);
  console.log("Pendiente:", today.totalPending);
  console.log("Mora (overdue):", today.totalOverdue);
  
  // Late fee aggregate
  const lateFeeSum = await prisma.paymentAllocation.aggregate({
    where: {
      payment: {
        paymentDate: today.collectionDate,
        cancelledAt: null,
      },
    },
    _sum: {
      lateFeeApplied: true,
    },
  });
  console.log("Mora cobrada hoy:", lateFeeSum._sum.lateFeeApplied ?? 0);
}

verify().finally(() => prisma.$disconnect());
