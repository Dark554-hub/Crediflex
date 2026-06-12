"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { refreshCollectionTotals } from "@/lib/collections";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function markCollectionItemMissedAction(formData: FormData) {
  const itemIds = formData.getAll("itemId").map(cleanText).filter(Boolean);
  const collectionDayId = cleanText(formData.get("collectionDayId"));
  const clientId = cleanText(formData.get("clientId"));

  if (itemIds.length === 0 || !collectionDayId) {
    throw new Error("Registro de cobranza invalido.");
  }

  await prisma.collectionItem.updateMany({
    where: {
      id: {
        in: itemIds,
      },
    },
    data: {
      status: "missed",
      notes: "No pago durante la jornada.",
    },
  });
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
