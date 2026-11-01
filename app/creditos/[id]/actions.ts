"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

async function refreshClientStatus(clientId: string) {
  const openCredits = await prisma.credit.count({
    where: {
      clientId,
      status: {
        in: ["active", "delinquent"],
      },
    },
  });

  await prisma.client.update({
    where: { id: clientId },
    data: {
      status: openCredits > 0 ? "active" : "settled",
    },
  });
}

export async function cancelCreditAction(formData: FormData) {
  const creditId = cleanText(formData.get("creditId"));

  if (!creditId) {
    throw new Error("Credito invalido.");
  }

  const credit = await prisma.credit.findUnique({
    where: { id: creditId },
    select: {
      id: true,
      clientId: true,
      status: true,
    },
  });

  if (!credit) {
    throw new Error("El credito no existe.");
  }

  if (credit.status === "cancelled") {
    redirect("/creditos");
  }

  await prisma.$transaction([
    prisma.credit.update({
      where: { id: credit.id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
    }),
    prisma.collectionItem.updateMany({
      where: { creditId: credit.id },
      data: {
        status: "missed",
        notes: "Credito cancelado.",
      },
    }),
  ]);

  await refreshClientStatus(credit.clientId);
  revalidatePath("/creditos");
  revalidatePath("/clientes");
  redirect("/creditos");
}

export async function cancelLastPaymentAction(formData: FormData) {
  const creditId = cleanText(formData.get("creditId"));

  if (!creditId) {
    throw new Error("Credito invalido.");
  }

  const payment = await prisma.payment.findFirst({
    where: {
      creditId,
      cancelledAt: null,
    },
    include: {
      credit: true,
      allocations: {
        include: {
          installment: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!payment) {
    throw new Error("No hay pagos activos para cancelar.");
  }

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        cancelledAt: new Date(),
      },
    }),
  ];

  for (const allocation of payment.allocations) {
    const totalApplied = Number(allocation.amountApplied) + Number(allocation.lateFeeApplied);
    const newPaidAmount = Math.max(Number(allocation.installment.paidAmount) - totalApplied, 0);
    const newStatus = newPaidAmount <= 0 ? "pending" : "partial";

    operations.push(
      prisma.creditInstallment.update({
        where: { id: allocation.installmentId },
        data: {
          paidAmount: newPaidAmount.toFixed(2),
          status: newStatus,
          paidAt: null,
        },
      }),
      prisma.collectionItem.updateMany({
        where: { installmentId: allocation.installmentId },
        data: {
          collectedAmount: {
            decrement: totalApplied,
          },
          status: newPaidAmount <= 0 ? "pending" : "partial",
        },
      }),
    );
  }

  if (payment.credit.status === "settled") {
    operations.push(
      prisma.credit.update({
        where: { id: payment.creditId },
        data: {
          status: "active",
          settledAt: null,
        },
      }),
    );
  }

  await prisma.$transaction(operations);
  await refreshClientStatus(payment.credit.clientId);

  revalidatePath(`/creditos/${creditId}`);
  revalidatePath("/creditos");
  revalidatePath("/cobros");
}

function getDailyDueDate(startDate: Date, index: number) {
  const d = new Date(startDate);
  let count = 0;
  while (count < index) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0) {
      count++;
    }
  }
  return d;
}

function getWeeklyDueDate(startDate: Date, weeklyCollectionDay: number, index: number) {
  const d = new Date(startDate);
  const currentDay = d.getUTCDay();
  const diffToCollectionDay = (weeklyCollectionDay - currentDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diffToCollectionDay + index * 7);
  return d;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export async function updateCreditDetailsAction(formData: FormData) {
  const creditId = cleanText(formData.get("creditId"));
  const startDateRaw = cleanText(formData.get("startDate"));
  const typeRaw = cleanText(formData.get("type")) as "daily" | "weekly" | "biweekly";
  const weeklyCollectionDayRaw = cleanText(formData.get("weeklyCollectionDay"));
  const zoneId = cleanText(formData.get("zoneId"));
  const recalculateSchedule = formData.get("recalculateSchedule") === "on";

  if (!creditId) {
    throw new Error("Credito invalido.");
  }

  const credit = await prisma.credit.findUnique({
    where: { id: creditId },
    include: {
      installments: {
        orderBy: { installmentNumber: "asc" },
      },
      payments: {
        where: { cancelledAt: null },
        orderBy: { paymentDate: "asc" },
      },
    },
  });

  if (!credit) {
    throw new Error("El credito no existe.");
  }

  const startDate = startDateRaw ? new Date(`${startDateRaw}T00:00:00.000Z`) : credit.startDate;
  if (Number.isNaN(startDate.getTime())) {
    throw new Error("La fecha de inicio no es valida.");
  }

  const validTypes = new Set(["daily", "weekly", "biweekly"]);
  const nextType = validTypes.has(typeRaw) ? typeRaw : credit.type;

  const parsedWeeklyDay =
    weeklyCollectionDayRaw !== "" && Number.isInteger(Number(weeklyCollectionDayRaw))
      ? Number(weeklyCollectionDayRaw)
      : startDate.getUTCDay();

  const resolvedWeeklyCollectionDay =
    nextType === "weekly" ? Math.min(Math.max(parsedWeeklyDay, 0), 6) : null;

  const operations: Prisma.PrismaPromise<unknown>[] = [];
  let expectedEndDate = credit.expectedEndDate;

  if (recalculateSchedule && credit.installments.length > 0) {
    const newDueDates: Date[] = [];

    for (let index = 0; index < credit.installments.length; index++) {
      const installment = credit.installments[index];
      const offsetIndex = credit.productType === "express" ? index + 1 : index;
      const dueDate =
        nextType === "daily"
          ? getDailyDueDate(startDate, index)
          : nextType === "biweekly"
            ? addDays(startDate, index * 15)
            : getWeeklyDueDate(startDate, resolvedWeeklyCollectionDay ?? startDate.getUTCDay(), offsetIndex);

      newDueDates.push(dueDate);

      operations.push(
        prisma.creditInstallment.update({
          where: { id: installment.id },
          data: {
            dueDate,
          },
        }),
      );
    }

    expectedEndDate = newDueDates[newDueDates.length - 1] ?? startDate;
  }

  operations.push(
    prisma.credit.update({
      where: { id: credit.id },
      data: {
        startDate,
        expectedEndDate,
        type: nextType,
        weeklyCollectionDay: resolvedWeeklyCollectionDay,
        ...(zoneId ? { zoneId } : {}),
      },
    }),
  );

  await prisma.$transaction(operations);

  revalidatePath(`/creditos/${creditId}`);
  revalidatePath("/creditos");
  revalidatePath("/cobros");
  revalidatePath("/atrasadas");
  revalidatePath("/");
}

