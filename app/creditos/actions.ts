"use server";

import { CreditProductType, CreditType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildAmortizationSchedule } from "@/lib/credit-calculations";
import { currentMexicoYear } from "@/lib/dates";
import { parseMoney, toDecimalString } from "@/lib/money";
import { prisma } from "@/lib/prisma";

type CreditFormState = {
  error?: string;
};

const creditTypes = new Set<CreditType>(["daily", "weekly", "biweekly"]);
const productTypes = new Set<CreditProductType>(["standard", "express"]);

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parsePositiveInteger(value: FormDataEntryValue | null, label: string) {
  const parsed = Number(cleanText(value));

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} debe ser un numero entero mayor a cero.`);
  }

  return parsed;
}

function parsePercent(value: FormDataEntryValue | null, label: string) {
  const parsed = Number(cleanText(value));

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} debe ser un porcentaje valido.`);
  }

  return parsed / 100;
}

function parseDate(value: FormDataEntryValue | null) {
  const raw = cleanText(value);

  if (!raw) {
    throw new Error("Selecciona la fecha de inicio.");
  }

  const date = new Date(`${raw}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("La fecha de inicio no es valida.");
  }

  return date;
}

function parseStartDate(formData: FormData) {
  const day = Number(cleanText(formData.get("startDay")));
  const month = Number(cleanText(formData.get("startMonth")));
  const currentYear = currentMexicoYear();

  if (Number.isInteger(day) && Number.isInteger(month) && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
    const date = new Date(Date.UTC(currentYear, month - 1, day));

    if (date.getUTCFullYear() === currentYear && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return date;
    }
  }

  return parseDate(formData.get("startDate"));
}

export async function createCreditAction(
  _state: CreditFormState,
  formData: FormData,
): Promise<CreditFormState> {
  let creditId = "";

  try {
    const clientId = cleanText(formData.get("clientId"));
    const zoneId = cleanText(formData.get("zoneId"));
    const productType = (cleanText(formData.get("productType")) || "standard") as CreditProductType;
    const requestedType = cleanText(formData.get("type")) as CreditType;
    const principalAmount = parseMoney(formData.get("principalAmount"));
    const installmentCount =
      productType === "express" ? 4 : parsePositiveInteger(formData.get("installmentCount"), "El numero de pagos");
    const interestRate =
      productType === "express" ? 0.2 : parsePercent(formData.get("interestRatePercent"), "El interes");
    const lateFeeAmount = parseMoney(formData.get("lateFeeAmount") ?? "0");
    const lateFeeRate = parsePercent(formData.get("lateFeeRatePercent") ?? "0", "La tasa de mora");
    const lateFeeGraceDays = Number(cleanText(formData.get("lateFeeGraceDays")) || "0");
    const printReceiptDefault = formData.get("printReceiptDefault") === "on";
    const weeklyCollectionDayValue = cleanText(formData.get("weeklyCollectionDay"));
    const weeklyCollectionDay = weeklyCollectionDayValue === "" ? null : Number(weeklyCollectionDayValue);
    const renewedFromCreditId = cleanText(formData.get("renewedFromCreditId"));
    const startDate = parseStartDate(formData);

    if (!clientId) {
      throw new Error("Selecciona un cliente.");
    }

    if (!zoneId) {
      throw new Error("Selecciona una zona de cobro.");
    }

    if (!productTypes.has(productType)) {
      throw new Error("Selecciona si el credito es normal o express.");
    }

    const type: CreditType = productType === "express" ? "weekly" : requestedType;

    if (!creditTypes.has(type)) {
      throw new Error("Selecciona si el credito es diario, semanal o quincenal.");
    }

    const resolvedWeeklyCollectionDay =
      typeof weeklyCollectionDay === "number" && Number.isInteger(weeklyCollectionDay)
        ? weeklyCollectionDay
        : null;

    if (
      type === "weekly" &&
      (resolvedWeeklyCollectionDay === null ||
        resolvedWeeklyCollectionDay < 0 ||
        resolvedWeeklyCollectionDay > 6)
    ) {
      throw new Error("Selecciona el dia de cobro semanal.");
    }

    if (principalAmount <= 0) {
      throw new Error("El monto prestado debe ser mayor a cero.");
    }

    if (productType === "express" && (principalAmount < 500 || principalAmount > 3000)) {
      throw new Error("El credito express solo permite montos desde $500 hasta $3,000.");
    }

    if (!Number.isInteger(lateFeeGraceDays) || lateFeeGraceDays < 0) {
      throw new Error("Los dias de gracia deben ser un entero mayor o igual a cero.");
    }

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!client) {
      throw new Error("El cliente seleccionado no existe o esta inactivo.");
    }

    const schedule = buildAmortizationSchedule({
      principalAmount,
      interestRate,
      installmentCount,
      type,
      productType,
      startDate,
      weeklyCollectionDay: resolvedWeeklyCollectionDay,
    });

    const [credit] = await prisma.$transaction([
      prisma.credit.create({
        data: {
          clientId,
          zoneId,
          productType,
          type,
          principalAmount: toDecimalString(principalAmount),
          interestRate: interestRate.toFixed(4),
          interestAmount: toDecimalString(schedule.interestAmount),
          totalAmount: toDecimalString(schedule.totalAmount),
          installmentCount,
          installmentAmount: toDecimalString(schedule.installmentAmount),
          lateFeeAmount: toDecimalString(lateFeeAmount),
          lateFeeRate: lateFeeRate.toFixed(4),
          lateFeeGraceDays,
          printReceiptDefault,
          weeklyCollectionDay: type === "weekly" ? resolvedWeeklyCollectionDay : null,
          renewedFromCreditId: renewedFromCreditId || null,
          startDate,
          expectedEndDate: schedule.expectedEndDate,
          installments: {
            create: schedule.installments.map((installment) => ({
              installmentNumber: installment.installmentNumber,
              dueDate: installment.dueDate,
              scheduledAmount: toDecimalString(installment.scheduledAmount),
              principalComponent: toDecimalString(installment.principalComponent),
              interestComponent: toDecimalString(installment.interestComponent),
            })),
          },
        },
      }),
      prisma.client.update({
        where: { id: clientId },
        data: {
          status: "active",
        },
      }),
    ]);

    creditId = credit.id;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo abrir el credito.",
    };
  }

  revalidatePath("/creditos");
  revalidatePath("/clientes");
  redirect(`/creditos/${creditId}`);
}
