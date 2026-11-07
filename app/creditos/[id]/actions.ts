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
          installment: {
            include: {
              allocations: {
                include: {
                  payment: true,
                },
              },
            },
          },
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
    const remainingActiveAllocations = allocation.installment.allocations.filter(
      (item) => item.paymentId !== payment.id && item.payment.cancelledAt === null,
    );
    const recomputedPaidAmount = remainingActiveAllocations.reduce(
      (sum, item) => sum + Number(item.amountApplied) + Number(item.lateFeeApplied),
      0,
    );
    const newPaidAmount = Math.max(recomputedPaidAmount, 0);
    const scheduled = Number(allocation.installment.scheduledAmount);
    const newStatus =
      newPaidAmount <= 0.01 ? "pending" : newPaidAmount + 0.01 >= scheduled ? "paid" : "partial";

    operations.push(
      prisma.creditInstallment.update({
        where: { id: allocation.installmentId },
        data: {
          paidAmount: newPaidAmount.toFixed(2),
          status: newStatus,
          paidAt: newStatus === "paid" ? allocation.installment.paidAt : null,
        },
      }),
      prisma.collectionItem.updateMany({
        where: { installmentId: allocation.installmentId },
        data: {
          collectedAmount: newPaidAmount.toFixed(2),
          status: newStatus,
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
  revalidatePath("/reportes");
}

export async function settleCreditAction(formData: FormData) {
  const creditId = cleanText(formData.get("creditId"));
  const rawAmount = cleanText(formData.get("settlementAmount")).replace(/,/g, "");
  const settlementAmount = Math.round(Number(rawAmount));
  const rawDate = cleanText(formData.get("paymentDate"));
  const methodRaw = cleanText(formData.get("method"));
  const method = (["cash", "transfer", "other"].includes(methodRaw) ? methodRaw : "cash") as
    | "cash"
    | "transfer"
    | "other";

  if (!creditId) {
    throw new Error("Credito invalido.");
  }

  if (!Number.isFinite(settlementAmount) || settlementAmount < 0) {
    throw new Error("El monto de liquidacion no es valido.");
  }

  const paymentDate = rawDate ? new Date(`${rawDate}T00:00:00.000Z`) : new Date();

  const credit = await prisma.credit.findUnique({
    where: { id: creditId },
    include: {
      installments: {
        where: {
          status: { in: ["pending", "partial", "overdue"] },
        },
        orderBy: { installmentNumber: "asc" },
      },
    },
  });

  if (!credit) {
    throw new Error("El credito no existe.");
  }

  if (credit.status === "settled" || credit.status === "cancelled") {
    redirect(`/creditos/${creditId}`);
  }

  const now = new Date();
  let remainingCents = Math.round(settlementAmount * 100);
  const allocations: Array<{
    installmentId: string;
    amountApplied: string;
    lateFeeApplied: string;
  }> = [];
  const operations: Prisma.PrismaPromise<unknown>[] = [];

  for (const installment of credit.installments) {
    const scheduledCents = Math.round(Number(installment.scheduledAmount) * 100);
    const paidCents = Math.round(Number(installment.paidAmount) * 100);
    const ordinaryPendingCents = Math.max(scheduledCents - paidCents, 0);
    const appliedOrdinaryCents = Math.min(remainingCents, ordinaryPendingCents);
    remainingCents = Math.max(remainingCents - appliedOrdinaryCents, 0);

    allocations.push({
      installmentId: installment.id,
      amountApplied: (appliedOrdinaryCents / 100).toFixed(2),
      lateFeeApplied: "0.00",
    });

    operations.push(
      prisma.creditInstallment.update({
        where: { id: installment.id },
        data: {
          paidAmount: installment.scheduledAmount,
          lateFeeAmount: "0.00",
          status: "paid",
          paidAt: now,
        },
      }),
      prisma.collectionItem.updateMany({
        where: { installmentId: installment.id },
        data: {
          collectedAmount: installment.scheduledAmount,
          status: "paid",
          notes: "Liquidado",
        },
      }),
    );
  }

  // Si sobro algo por mora o cargo de liquidacion, sumarlo a la ultima cuota
  if (remainingCents > 0 && allocations.length > 0) {
    const lastAlloc = allocations[allocations.length - 1];
    const currentApplied = Math.round(Number(lastAlloc.amountApplied) * 100);
    lastAlloc.amountApplied = ((currentApplied + remainingCents) / 100).toFixed(2);
  }

  const paymentCreate = prisma.payment.create({
    data: {
      clientId: credit.clientId,
      creditId: credit.id,
      paymentDate,
      amount: settlementAmount.toFixed(2),
      method,
      notes: "Liquidacion total del prestamo",
      allocations: {
        create: allocations,
      },
    },
  });

  operations.unshift(paymentCreate);
  operations.push(
    prisma.credit.update({
      where: { id: credit.id },
      data: {
        status: "settled",
        settledAt: now,
      },
    }),
  );

  const [createdPayment] = await prisma.$transaction(operations);
  await refreshClientStatus(credit.clientId);

  revalidatePath(`/creditos/${creditId}`);
  revalidatePath("/creditos");
  revalidatePath("/clientes");
  revalidatePath("/cobros");
  revalidatePath("/atrasadas");
  revalidatePath("/reportes");
  revalidatePath("/");

  const paymentId = (createdPayment as { id: string }).id;
  redirect(`/creditos/${creditId}?pago=${paymentId}`);
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

