import { prisma } from "@/lib/prisma";
import { todayInMexicoAsUtcDate } from "@/lib/dates";
import { syncAutomaticLateFees } from "@/lib/late-fees";

function startOfTodayUtc() {
  return todayInMexicoAsUtcDate();
}

function itemBalance(installment: {
  scheduledAmount: unknown;
  lateFeeAmount: unknown;
  paidAmount: unknown;
}) {
  return Math.max(
    Number(installment.scheduledAmount) +
      Number(installment.lateFeeAmount) -
      Number(installment.paidAmount),
    0,
  );
}

export async function getOrCreateTodayCollection() {
  await syncAutomaticLateFees();

  const today = startOfTodayUtc();
  let collectionDay = await prisma.collectionDay.findUnique({
    where: { collectionDate: today },
  });

  if (!collectionDay) {
    collectionDay = await prisma.collectionDay.create({
      data: {
        collectionDate: today,
      },
    });
  }

  const dueInstallments = await prisma.creditInstallment.findMany({
    where: {
      dueDate: {
        lte: today,
      },
      status: {
        in: ["pending", "partial", "overdue"],
      },
      credit: {
        status: {
          in: ["active", "delinquent"],
        },
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

  await prisma.$transaction(
    dueInstallments.map((installment) =>
      prisma.collectionItem.upsert({
        where: {
          collectionDayId_installmentId: {
            collectionDayId: collectionDay.id,
            installmentId: installment.id,
          },
        },
        create: {
          collectionDayId: collectionDay.id,
          clientId: installment.credit.clientId,
          creditId: installment.creditId,
          installmentId: installment.id,
          zoneId: installment.credit.zoneId,
          expectedAmount: itemBalance(installment).toFixed(2),
          collectedAmount: "0.00",
          status: installment.dueDate < today ? "overdue" : "pending",
        },
        update: {
          expectedAmount: itemBalance(installment).toFixed(2),
          status: installment.dueDate < today ? "overdue" : "pending",
        },
      }),
    ),
  );

  await refreshCollectionTotals(collectionDay.id);

  return prisma.collectionDay.findUniqueOrThrow({
    where: { id: collectionDay.id },
    include: {
      items: {
        include: {
          client: true,
          credit: true,
          installment: true,
          zone: true,
        },
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });
}

export async function getTodayCollectionForClient(clientId: string) {
  const collectionDay = await getOrCreateTodayCollection();

  return {
    ...collectionDay,
    items: collectionDay.items.filter((item) => item.clientId === clientId),
  };
}

export async function refreshCollectionTotals(collectionDayId: string) {
  const items = await prisma.collectionItem.findMany({
    where: { collectionDayId },
    select: {
      expectedAmount: true,
      collectedAmount: true,
      status: true,
    },
  });

  const totalExpected = items.reduce((total, item) => total + Number(item.expectedAmount), 0);
  const totalCollected = items.reduce((total, item) => total + Number(item.collectedAmount), 0);
  const totalOverdue = items
    .filter((item) => item.status === "overdue" || item.status === "missed")
    .reduce((total, item) => total + Math.max(Number(item.expectedAmount) - Number(item.collectedAmount), 0), 0);
  const totalPending = items.reduce(
    (total, item) => total + Math.max(Number(item.expectedAmount) - Number(item.collectedAmount), 0),
    0,
  );

  await prisma.collectionDay.update({
    where: { id: collectionDayId },
    data: {
      totalExpected: totalExpected.toFixed(2),
      totalCollected: totalCollected.toFixed(2),
      totalPending: totalPending.toFixed(2),
      totalOverdue: totalOverdue.toFixed(2),
    },
  });
}

export async function getCollectionHistory() {
  return prisma.collectionDay.findMany({
    include: {
      items: {
        include: {
          zone: true,
          client: true,
        },
      },
    },
    orderBy: {
      collectionDate: "desc",
    },
    take: 60,
  });
}
