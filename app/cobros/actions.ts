"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { refreshCollectionTotals } from "@/lib/collections";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function addDaysUtc(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export async function markCollectionItemMissedAction(formData: FormData) {
  const itemIds = formData.getAll("itemId").map(cleanText).filter(Boolean);
  const collectionDayId = cleanText(formData.get("collectionDayId"));
  const clientId = cleanText(formData.get("clientId"));

  if (itemIds.length === 0 || !collectionDayId) {
    throw new Error("Registro de cobranza invalido.");
  }

  const items = await prisma.collectionItem.findMany({
    where: { id: { in: itemIds } },
    include: {
      installment: true,
      credit: true,
    },
  });
  const shiftByCredit = new Map<string, number>();

  for (const item of items) {
    const current = shiftByCredit.get(item.creditId);
    if (current === undefined || item.installment.installmentNumber < current) {
      shiftByCredit.set(item.creditId, item.installment.installmentNumber);
    }
  }

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.collectionItem.updateMany({
      where: {
        id: {
          in: itemIds,
        },
      },
      data: {
        status: "missed",
        notes: "No pago durante la jornada.",
      },
    }),
  ];

  for (const [creditId, fromInstallmentNumber] of Array.from(shiftByCredit.entries())) {
    const pendingInstallments = await prisma.creditInstallment.findMany({
      where: {
        creditId,
        installmentNumber: {
          gte: fromInstallmentNumber,
        },
        status: {
          in: ["pending", "partial", "overdue"],
        },
      },
      select: {
        id: true,
        dueDate: true,
      },
    });

    // Corrimiento automatico por no pago:
    // si una cuota vencida no se paga hoy, esa cuota y las siguientes pendientes
    // se mueven un dia adelante para mantener el consecutivo de cobro.
    const missedInstallmentIds = new Set(items.map((item) => item.installmentId));
    for (const installment of pendingInstallments) {
      operations.push(
        prisma.creditInstallment.update({
          where: { id: installment.id },
          data: {
            dueDate: addDaysUtc(installment.dueDate, 1),
            ...(missedInstallmentIds.has(installment.id) ? { status: "pending" } : {}),
          },
        }),
      );
    }

    const lastDueDate = pendingInstallments.reduce<Date | null>(
      (last, installment) => {
        const movedDate = addDaysUtc(installment.dueDate, 1);
        return !last || movedDate > last ? movedDate : last;
      },
      null,
    );

    if (lastDueDate) {
      operations.push(
        prisma.credit.update({
          where: { id: creditId },
          data: {
            expectedEndDate: lastDueDate,
          },
        }),
      );
    }
  }

  await prisma.$transaction(operations);
  await refreshCollectionTotals(collectionDayId);
  revalidatePath("/cobros");
  if (clientId) {
    revalidatePath(`/cobros/${clientId}`);
  }
}

export async function closeCollectionDayAction(formData: FormData) {
  const collectionDayId = cleanText(formData.get("collectionDayId"));

  if (!collectionDayId) {
    throw new Error("Jornada invalida.");
  }

  await refreshCollectionTotals(collectionDayId);
  await prisma.collectionDay.update({
    where: { id: collectionDayId },
    data: {
      closedAt: new Date(),
    },
  });
  revalidatePath("/cobros");
}
