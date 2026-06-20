"use server";

import { revalidatePath } from "next/cache";
import { parseMoney, toDecimalString } from "@/lib/money";
import { prisma } from "@/lib/prisma";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseDate(value: FormDataEntryValue | null) {
  const text = cleanText(value);
  const date = new Date(`${text}T00:00:00.000Z`);

  if (!text || Number.isNaN(date.getTime())) {
    throw new Error("Selecciona una fecha valida.");
  }

  return date;
}

export async function saveInitialCapitalAction(formData: FormData) {
  const financeDate = parseDate(formData.get("financeDate"));
  const initialCapital = parseMoney(formData.get("initialCapital"));

  if (initialCapital < 0) {
    throw new Error("El capital inicial no puede ser negativo.");
  }

  await prisma.dailyFinanceEntry.upsert({
    where: {
      financeDate,
    },
    create: {
      financeDate,
      initialCapital: toDecimalString(initialCapital),
    },
    update: {
      initialCapital: toDecimalString(initialCapital),
    },
  });

  revalidatePath("/finanzas");
}

export async function createExpenseAction(formData: FormData) {
  const expenseDate = parseDate(formData.get("expenseDate"));
  const concept = cleanText(formData.get("concept"));
  const amount = parseMoney(formData.get("amount"));

  if (!concept) {
    throw new Error("Escribe el concepto del gasto.");
  }

  if (amount <= 0) {
    throw new Error("El gasto debe ser mayor a cero.");
  }

  await prisma.expense.create({
    data: {
      expenseDate,
      concept,
      amount: toDecimalString(amount),
    },
  });

  revalidatePath("/finanzas");
}

export async function deleteExpenseAction(formData: FormData) {
  const id = cleanText(formData.get("id"));

  if (!id) {
    throw new Error("Gasto invalido.");
  }

  await prisma.expense.delete({
    where: { id },
  });

  revalidatePath("/finanzas");
}
