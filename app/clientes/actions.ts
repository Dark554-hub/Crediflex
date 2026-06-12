"use server";

import { ClientStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type ClientFormState = {
  error?: string;
};

const clientStatuses = new Set<ClientStatus>([
  "active",
  "settled",
  "delinquent",
  "inactive",
]);

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function getClientPayload(formData: FormData) {
  const fullName = cleanText(formData.get("fullName"));
  const identification = cleanText(formData.get("identification"));
  const clientNumber = cleanText(formData.get("clientNumber"));
  const phone = cleanText(formData.get("phone"));
  const homePhone = cleanText(formData.get("homePhone"));
  const email = cleanText(formData.get("email"));
  const address = cleanText(formData.get("address"));
  const personalReferenceName = cleanText(formData.get("personalReferenceName"));
  const personalReferencePhone = cleanText(formData.get("personalReferencePhone"));
  const personalReferenceAddress = cleanText(formData.get("personalReferenceAddress"));
  const zoneId = cleanText(formData.get("zoneId"));
  const notes = cleanText(formData.get("notes"));
  const statusValue = cleanText(formData.get("status")) as ClientStatus;

  if (fullName.length < 3) {
    throw new Error("El nombre debe tener al menos 3 caracteres.");
  }

  if (address.length < 8) {
    throw new Error("La direccion debe ser suficientemente clara para la ruta.");
  }

  if (!zoneId) {
    throw new Error("Selecciona una zona de cobro.");
  }

  if (!clientStatuses.has(statusValue)) {
    throw new Error("Selecciona un estado valido.");
  }

  return {
    fullName,
    identification: identification || null,
    clientNumber: clientNumber || null,
    phone: phone || null,
    homePhone: homePhone || null,
    email: email || null,
    address,
    personalReferenceName: personalReferenceName || null,
    personalReferencePhone: personalReferencePhone || null,
    personalReferenceAddress: personalReferenceAddress || null,
    zoneId,
    notes: notes || null,
    status: statusValue,
  };
}

export async function createClientAction(
  _state: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  try {
    const payload = getClientPayload(formData);

    await prisma.client.create({
      data: payload,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo crear el cliente.",
    };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function updateClientAction(
  id: string,
  _state: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  try {
    const payload = getClientPayload(formData);

    await prisma.client.update({
      where: { id },
      data: payload,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo actualizar el cliente.",
    };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

export async function deleteClientAction(formData: FormData) {
  const id = cleanText(formData.get("id"));

  if (!id) {
    throw new Error("Cliente invalido.");
  }

  await prisma.client.update({
    where: { id },
    data: {
      status: "inactive",
      deletedAt: new Date(),
    },
  });

  revalidatePath("/clientes");
  redirect("/clientes");
}
