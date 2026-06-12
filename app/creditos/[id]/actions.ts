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
