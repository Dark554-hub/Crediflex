"use server";

import { PaymentMethod, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMoney, toDecimalString } from "@/lib/money";
import { prisma } from "@/lib/prisma";

type PaymentFormState = {
  error?: string;
};

const paymentMethods = new Set<PaymentMethod>(["cash", "transfer", "other"]);

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseDate(value: FormDataEntryValue | null) {
  const raw = cleanText(value);

  if (!raw) {
    throw new Error("Selecciona la fecha del pago.");
  }

  const date = new Date(`${raw}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("La fecha del pago no es valida.");
  }

  return date;
}

export async function createPaymentAction(
  creditId: string,
  _state: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  let paymentId = "";

  try {
    const amount = parseMoney(formData.get("amount"));
    const additionalLateFee = parseMoney(formData.get("additionalLateFee") ?? "0");
    const paymentDate = parseDate(formData.get("paymentDate"));
    const method = cleanText(formData.get("method")) as PaymentMethod;
    const notes = cleanText(formData.get("notes"));

    if (amount <= 0) {
      throw new Error("El monto del pago debe ser mayor a cero.");
    }

    if (!paymentMethods.has(method)) {
      throw new Error("Selecciona un metodo de pago valido.");
    }

    const credit = await prisma.credit.findUnique({
      where: { id: creditId },
      include: {
        client: true,
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

    if (!credit) {
      throw new Error("El credito no existe.");
    }

    if (credit.status === "settled" || credit.status === "cancelled") {
      throw new Error("Este credito ya no acepta pagos.");
    }

    let remainingCents = Math.round(amount * 100);
    let pendingAdditionalLateFeeCents = Math.round(additionalLateFee * 100);
    let paidInstallmentsInThisPayment = 0;
    const now = new Date();
    const allocations: Array<{
      installmentId: string;
      amountApplied: string;
      lateFeeApplied: string;
    }> = [];
    const installmentUpdates = [];
    const collectionItemUpdates = [];

    for (const installment of credit.installments) {
      if (remainingCents <= 0) break;

      const scheduledCents = Math.round(Number(installment.scheduledAmount) * 100);
      const existingLateFeeCents = Math.round(Number(installment.lateFeeAmount) * 100);
      const paidCents = Math.round(Number(installment.paidAmount) * 100);
      const extraLateFeeForInstallmentCents = pendingAdditionalLateFeeCents > 0 ? pendingAdditionalLateFeeCents : 0;
      const lateFeeCents = existingLateFeeCents + extraLateFeeForInstallmentCents;

      // Saldo de cuota:
      // saldo_cuota = scheduled_amount + late_fee_amount - paid_amount.
      // Se trabaja en centavos para evitar errores de redondeo con decimales financieros.
      const installmentBalanceCents = Math.max(scheduledCents + lateFeeCents - paidCents, 0);
      const appliedCents = Math.min(remainingCents, installmentBalanceCents);

      if (appliedCents <= 0) continue;

      // Primero se cubre el monto ordinario pendiente; cualquier excedente de la aplicacion
      // se registra como mora pagada para que el comprobante la muestre separada.
      const ordinaryPendingCents = Math.max(scheduledCents - paidCents, 0);
      const ordinaryAppliedCents = Math.min(appliedCents, ordinaryPendingCents);
      const lateFeeAppliedCents = appliedCents - ordinaryAppliedCents;
      const newPaidCents = paidCents + appliedCents;
      const isPaid = newPaidCents >= scheduledCents + lateFeeCents;

      if (isPaid) {
        paidInstallmentsInThisPayment += 1;
      }

      allocations.push({
        installmentId: installment.id,
        amountApplied: toDecimalString(ordinaryAppliedCents / 100),
        lateFeeApplied: toDecimalString(lateFeeAppliedCents / 100),
      });

      installmentUpdates.push(
        prisma.creditInstallment.update({
          where: { id: installment.id },
          data: {
            lateFeeAmount: toDecimalString(lateFeeCents / 100),
            paidAmount: toDecimalString(newPaidCents / 100),
            status: isPaid ? "paid" : "partial",
            paidAt: isPaid ? now : null,
          },
        }),
      );
      collectionItemUpdates.push(
        prisma.collectionItem.updateMany({
          where: {
            installmentId: installment.id,
          },
          data: {
            collectedAmount: {
              increment: appliedCents / 100,
            },
            status: isPaid ? "paid" : "partial",
          },
        }),
      );

      remainingCents -= appliedCents;
      pendingAdditionalLateFeeCents = 0;
    }

    if (remainingCents > 0) {
      throw new Error("El pago excede el saldo pendiente del credito.");
    }

    if (allocations.length === 0) {
      throw new Error("No hay cuotas pendientes para aplicar este pago.");
    }

    const willSettleCredit = credit.installments.length - paidInstallmentsInThisPayment === 0;
    const otherOpenCredits = willSettleCredit
      ? await prisma.credit.count({
          where: {
            clientId: credit.clientId,
            id: { not: credit.id },
            status: { in: ["active", "delinquent"] },
          },
        })
      : 0;

    const paymentCreate = prisma.payment.create({
      data: {
        clientId: credit.clientId,
        creditId: credit.id,
        paymentDate,
        amount: toDecimalString(amount),
        method,
        notes: notes || null,
        allocations: {
          create: allocations,
        },
      },
    });

    const operations: Prisma.PrismaPromise<unknown>[] = [
      paymentCreate,
      ...installmentUpdates,
      ...collectionItemUpdates,
    ];

    if (willSettleCredit) {
      operations.push(
        prisma.credit.update({
          where: { id: credit.id },
          data: {
            status: "settled",
            settledAt: now,
          },
        }),
        prisma.client.update({
          where: { id: credit.clientId },
          data: {
            status: otherOpenCredits > 0 ? "active" : "settled",
          },
        }),
      );
    }

    const [payment] = await prisma.$transaction(operations);
    paymentId = (payment as { id: string }).id;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo registrar el pago.",
    };
  }

  revalidatePath(`/creditos/${creditId}`);
  revalidatePath("/creditos");
  revalidatePath("/clientes");
  redirect(`/creditos/${creditId}?pago=${paymentId}`);
}
