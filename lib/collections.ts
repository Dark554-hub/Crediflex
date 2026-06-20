import { prisma } from "@/lib/prisma";
import { todayInMexicoAsUtcDate } from "@/lib/dates";
import { syncAutomaticLateFees } from "@/lib/late-fees";

const globalForCollections = globalThis as unknown as {
  collectionBuild?: {
    dateKey: string;
    builtAt: number;
  };
};

const COLLECTION_BUILD_TTL_MS = 60 * 1000;

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
  const dateKey = today.toISOString().slice(0, 10);
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

  const buildState = globalForCollections.collectionBuild;
  const canUseExistingItems =
    buildState?.dateKey === dateKey && Date.now() - buildState.builtAt < COLLECTION_BUILD_TTL_MS;

  if (canUseExistingItems) {
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

  const existingItems = await prisma.collectionItem.findMany({
    where: {
      collectionDayId: collectionDay.id,
    },
    select: {
      id: true,
      installmentId: true,
      expectedAmount: true,
      status: true,
    },
  });
  const existingByInstallmentId = new Map(existingItems.map((item) => [item.installmentId, item]));
  const operations = dueInstallments.flatMap((installment) => {
    const existing = existingByInstallmentId.get(installment.id);
    const expectedAmount = itemBalance(installment);
    const expectedStatus = installment.dueDate < today ? "overdue" : "pending";

    if (!existing) {
      return [
        prisma.collectionItem.create({
          data: {
            collectionDayId: collectionDay.id,
            clientId: installment.credit.clientId,
            creditId: installment.creditId,
            installmentId: installment.id,
            zoneId: installment.credit.zoneId,
            expectedAmount: expectedAmount.toFixed(2),
            collectedAmount: "0.00",
            status: expectedStatus,
          },
        }),
      ];
    }

    const amountChanged = Math.abs(Number(existing.expectedAmount) - expectedAmount) >= 0.01;
    const statusChanged = existing.status !== expectedStatus && existing.status !== "paid" && existing.status !== "partial";

    if (!amountChanged && !statusChanged) {
      return [];
    }

    return [
      prisma.collectionItem.update({
        where: { id: existing.id },
        data: {
          expectedAmount: expectedAmount.toFixed(2),
          status: statusChanged ? expectedStatus : existing.status,
        },
      }),
    ];
  });

  if (operations.length > 0) {
    await prisma.$transaction(operations);
    await refreshCollectionTotals(collectionDay.id);
  }

  globalForCollections.collectionBuild = {
    dateKey,
    builtAt: Date.now(),
  };

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
