"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { todayInMexicoAsUtcDate } from "@/lib/dates";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseMoney(value: FormDataEntryValue | null, label: string) {
  const number = Number(cleanText(value).replace(/,/g, ""));

  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} debe ser mayor a cero.`);
  }

  return number;
}

function parseDate(value: FormDataEntryValue | null) {
  const text = cleanText(value);
  const date = new Date(`${text}T00:00:00.000Z`);

  if (!text || Number.isNaN(date.getTime())) {
    throw new Error("Selecciona una fecha valida.");
  }

  return date;
}

export async function createAgreementAction(creditId: string, formData: FormData) {
  const promisedAmount = parseMoney(formData.get("promisedAmount"), "El monto prometido");
  const promisedPaymentDate = parseDate(formData.get("promisedPaymentDate"));
  const credit = await prisma.credit.findUnique({
    where: { id: creditId },
    select: {
      id: true,
      clientId: true,
    },
  });

  if (!credit) {
    throw new Error("El credito no existe.");
  }

  await prisma.delinquencyAgreement.create({
    data: {
      creditId: credit.id,
      clientId: credit.clientId,
      agreementDate: todayInMexicoAsUtcDate(),
      promisedPaymentDate,
      promisedAmount: promisedAmount.toFixed(2),
      status: "active",
    },
  });

  revalidatePath(`/creditos/${credit.id}`);
}
