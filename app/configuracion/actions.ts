"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseMoney, toDecimalString } from "@/lib/money";

type ActionState = {
  error?: string;
  success?: string;
};

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parsePercent(value: FormDataEntryValue | null, label: string) {
  const parsed = Number(cleanText(value));

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} debe ser un porcentaje valido.`);
  }

  return parsed / 100;
}

function parseInteger(value: FormDataEntryValue | null, label: string) {
  const parsed = Number(cleanText(value));

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} debe ser un entero mayor o igual a cero.`);
  }

  return parsed;
}

export async function updateCreditSettingsAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = cleanText(formData.get("id"));
    const defaultDailyInterestRate = parsePercent(formData.get("defaultDailyInterestRate"), "La tasa diaria");
    const defaultWeeklyInterestRate = parsePercent(formData.get("defaultWeeklyInterestRate"), "La tasa semanal");
    const defaultLateFeeAmount = parseMoney(formData.get("defaultLateFeeAmount"));
    const defaultLateFeeRate = parsePercent(formData.get("defaultLateFeeRate"), "La tasa de mora");
    const lateFeeGraceDays = parseInteger(formData.get("lateFeeGraceDays"), "Los dias de gracia");

    await prisma.creditSetting.upsert({
      where: { id },
      create: {
        defaultDailyInterestRate: defaultDailyInterestRate.toFixed(4),
        defaultWeeklyInterestRate: defaultWeeklyInterestRate.toFixed(4),
        defaultLateFeeAmount: toDecimalString(defaultLateFeeAmount),
        defaultLateFeeRate: defaultLateFeeRate.toFixed(4),
        lateFeeGraceDays,
      },
      update: {
        defaultDailyInterestRate: defaultDailyInterestRate.toFixed(4),
        defaultWeeklyInterestRate: defaultWeeklyInterestRate.toFixed(4),
        defaultLateFeeAmount: toDecimalString(defaultLateFeeAmount),
        defaultLateFeeRate: defaultLateFeeRate.toFixed(4),
        lateFeeGraceDays,
      },
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo guardar la configuracion.",
    };
  }

  revalidatePath("/configuracion");
  return { success: "Configuracion financiera guardada." };
}

export async function updateProfileAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = cleanText(formData.get("id"));
    const fullName = cleanText(formData.get("fullName"));
    const phone = cleanText(formData.get("phone"));
    const mainZoneId = cleanText(formData.get("mainZoneId"));

    if (fullName.length < 3) {
      throw new Error("El nombre del operador debe tener al menos 3 caracteres.");
    }

    await prisma.profile.update({
      where: { id },
      data: {
        fullName,
        phone: phone || null,
        mainZoneId: mainZoneId || null,
      },
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo guardar el operador.",
    };
  }

  revalidatePath("/configuracion");
  return { success: "Operador guardado." };
}

export async function createZoneAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const name = cleanText(formData.get("name"));
    const description = cleanText(formData.get("description"));

    if (name.length < 2) {
      throw new Error("El nombre de la zona debe tener al menos 2 caracteres.");
    }

    await prisma.zone.create({
      data: {
        name,
        description: description || null,
      },
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo crear la zona.",
    };
  }

  revalidatePath("/configuracion");
  return { success: "Zona creada." };
}

export async function toggleZoneAction(formData: FormData) {
  const id = cleanText(formData.get("id"));
  const isActive = cleanText(formData.get("isActive")) === "true";

  if (!id) {
    throw new Error("Zona invalida.");
  }

  await prisma.zone.update({
    where: { id },
    data: {
      isActive: !isActive,
    },
  });

  revalidatePath("/configuracion");
}
