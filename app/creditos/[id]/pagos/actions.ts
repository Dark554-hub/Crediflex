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
          include: {
            allocations: {
              where: {
                payment: {
                  cancelledAt: null,
                },
              },
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

    const isSettlement = cleanText(formData.get("isSettlement")) === "true";
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

    if (isSettlement) {
      for (const installment of credit.installments) {
        const scheduledCents = Math.round(Number(installment.scheduledAmount) * 100);
        const paidCents = Math.round(Number(installment.paidAmount) * 100);
        const ordinaryPendingCents = Math.max(scheduledCents - paidCents, 0);
        const appliedOrdinaryCents = Math.min(remainingCents, ordinaryPendingCents);
        remainingCents = Math.max(remainingCents - appliedOrdinaryCents, 0);

        if (appliedOrdinaryCents > 0) {
          allocations.push({
            installmentId: installment.id,
            amountApplied: toDecimalString(appliedOrdinaryCents / 100),
            lateFeeApplied: "0.00",
          });
        }

        installmentUpdates.push(
          prisma.creditInstallment.update({
            where: { id: installment.id },
            data: {
              paidAmount: installment.scheduledAmount,
              lateFeeAmount: "0.00",
              status: "paid",
              paidAt: now,
            },
          }),
        );

        collectionItemUpdates.push(
          prisma.collectionItem.updateMany({
            where: {
              installmentId: installment.id,
            },
            data: {
              collectedAmount: installment.scheduledAmount,
              status: "paid",
              notes: "Liquidado",
            },
          }),
        );
      }

      if (remainingCents > 0) {
        if (allocations.length > 0) {
          const lastAlloc = allocations[allocations.length - 1];
          const extraLateFeeCents = Math.min(remainingCents, pendingAdditionalLateFeeCents);
          const extraOrdinaryCents = remainingCents - extraLateFeeCents;
          lastAlloc.amountApplied = toDecimalString(
            (Math.round(Number(lastAlloc.amountApplied) * 100) + extraOrdinaryCents) / 100,
          );
          lastAlloc.lateFeeApplied = toDecimalString(
            (Math.round(Number(lastAlloc.lateFeeApplied) * 100) + extraLateFeeCents) / 100,
          );
        } else if (credit.installments.length > 0) {
          allocations.push({
            installmentId: credit.installments[0].id,
            amountApplied: toDecimalString(remainingCents / 100),
            lateFeeApplied: "0.00",
          });
        }
      }

      paidInstallmentsInThisPayment = credit.installments.length;
    } else {
      for (const installment of credit.installments) {
        if (remainingCents <= 0) break;

        const scheduledCents = Math.round(Number(installment.scheduledAmount) * 100);
        const existingLateFeeCents = Math.round(Number(installment.lateFeeAmount) * 100);
        const paidCents = Math.min(
          Math.round(Number(installment.paidAmount) * 100),
          scheduledCents,
        );
        const paidLateFeeCents = installment.allocations.reduce(
          (sum, a) => sum + Math.round(Number(a.lateFeeApplied) * 100),
          0,
        );

        const extraLateFeeForInstallmentCents =
          pendingAdditionalLateFeeCents > 0 ? pendingAdditionalLateFeeCents : 0;
        const totalLateFeeCents = existingLateFeeCents + extraLateFeeForInstallmentCents;

        const ordinaryPendingCents = Math.max(scheduledCents - paidCents, 0);
        const lateFeePendingCents = Math.max(totalLateFeeCents - paidLateFeeCents, 0);
        const installmentBalanceCents = ordinaryPendingCents + lateFeePendingCents;
        const appliedCents = Math.min(remainingCents, installmentBalanceCents);

        if (appliedCents <= 0) continue;

        const ordinaryAppliedCents = Math.min(appliedCents, ordinaryPendingCents);
        const lateFeeAppliedCents = Math.min(appliedCents - ordinaryAppliedCents, lateFeePendingCents);

        // paidAmount en la cuota representa EXCLUSIVAMENTE el abono a la cuota ordinaria
        // NUNCA debe incluir mora ni exceder scheduledAmount
        const newPaidCents = Math.min(paidCents + ordinaryAppliedCents, scheduledCents);

        const isOrdinaryPaid = newPaidCents >= scheduledCents;
        const isLateFeePaid = paidLateFeeCents + lateFeeAppliedCents >= totalLateFeeCents;
        const isPaid = isOrdinaryPaid && isLateFeePaid;

        if (isPaid) {
          paidInstallmentsInThisPayment += 1;
        }

        if (ordinaryAppliedCents > 0 || lateFeeAppliedCents > 0) {
          allocations.push({
            installmentId: installment.id,
            amountApplied: toDecimalString(ordinaryAppliedCents / 100),
            lateFeeApplied: toDecimalString(lateFeeAppliedCents / 100),
          });
        }

        installmentUpdates.push(
          prisma.creditInstallment.update({
            where: { id: installment.id },
            data: {
              lateFeeAmount: toDecimalString(totalLateFeeCents / 100),
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
    }

    // FILTRO DE SEGURIDAD ABSOLUTO:
    // Postgres prohíbe registrar asignaciones donde amount_applied <= 0 Y late_fee_applied <= 0
    // (restricción check "payment_allocations_positive_amounts").
    const validAllocations = allocations.filter((alloc) => {
      const amt = Number(alloc.amountApplied);
      const fee = Number(alloc.lateFeeApplied);
      return (Number.isFinite(amt) && amt > 0) || (Number.isFinite(fee) && fee > 0);
    });

    if (validAllocations.length === 0) {
      if (credit.installments.length > 0 && amount > 0) {
        validAllocations.push({
          installmentId: credit.installments[0].id,
          amountApplied: toDecimalString(amount),
          lateFeeApplied: "0.00",
        });
      } else {
        throw new Error("No hay cuotas pendientes para aplicar este pago.");
      }
    }

    const willSettleCredit =
      isSettlement || credit.installments.length - paidInstallmentsInThisPayment === 0;
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
        notes: notes || (isSettlement ? "Liquidacion total del prestamo" : null),
        allocations: {
          create: validAllocations,
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
    console.error("Error creating payment:", error);
    return {
      error:
        error instanceof Error
          ? error.message.includes("check constraint") || error.message.includes("ConnectorError")
            ? "Ocurrió un error al procesar el desglose del pago en el sistema. Intenta de nuevo."
            : error.message
          : "No se pudo registrar el pago.",
    };
  }

  revalidatePath(`/creditos/${creditId}`);
  revalidatePath("/creditos");
  revalidatePath("/clientes");
  revalidatePath("/cobros");
  revalidatePath("/atrasadas");
  revalidatePath("/reportes");
  revalidatePath("/");
  redirect(`/creditos/${creditId}?pago=${paymentId}`);
}

