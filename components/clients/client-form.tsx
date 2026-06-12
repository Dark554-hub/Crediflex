"use client";

import { Client, ClientStatus, Zone } from "@prisma/client";
import { Save } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { createClientAction, updateClientAction } from "@/app/clientes/actions";
import { statusLabels } from "@/components/clients/status-badge";

type ClientFormProps = {
  zones: Zone[];
  client?: Client;
};

const statuses: ClientStatus[] = ["active", "settled", "delinquent", "inactive"];
const inputClass =
  "min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10";

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      <Save size={18} aria-hidden />
      {pending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear cliente"}
    </Button>
  );
}

export function ClientForm({ zones, client }: ClientFormProps) {
  const action = client ? updateClientAction.bind(null, client.id) : createClientAction;
  const [state, formAction] = useFormState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm font-medium text-clay">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-5">
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold text-ink">Nombre completo</span>
          <input
            name="fullName"
            defaultValue={client?.fullName ?? ""}
            required
            minLength={3}
            className={inputClass}
            placeholder="Nombre del cliente"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Identificacion</span>
          <input
            name="identification"
            defaultValue={client?.identification ?? ""}
            className={inputClass}
            placeholder="Identificacion"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink"># Cliente</span>
          <input
            name="clientNumber"
            defaultValue={client?.clientNumber ?? ""}
            className={inputClass}
            placeholder="# Cliente"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Telefono</span>
          <input
            name="phone"
            defaultValue={client?.phone ?? ""}
            inputMode="tel"
            className={inputClass}
            placeholder="999 000 0000"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Telefono de casa</span>
          <input
            name="homePhone"
            defaultValue={client?.homePhone ?? ""}
            inputMode="tel"
            className={inputClass}
            placeholder="Telefono de casa"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Correo</span>
          <input
            name="email"
            defaultValue={client?.email ?? ""}
            inputMode="email"
            className={inputClass}
            placeholder="Correo"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Zona</span>
          <select
            name="zoneId"
            defaultValue={client?.zoneId ?? ""}
            required
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona zona
            </option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Estado</span>
          <select
            name="status"
            defaultValue={client?.status ?? "active"}
            required
            className={inputClass}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold text-ink">Direccion</span>
          <textarea
            name="address"
            defaultValue={client?.address ?? ""}
            required
            minLength={8}
            rows={3}
            className="w-full rounded-md border border-line bg-white px-4 py-3 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            placeholder="Calle, cruzamientos, colonia o referencia de ruta"
          />
        </label>

        <div className="rounded-md bg-mint/45 px-4 py-3 sm:col-span-2">
          <p className="text-sm font-bold text-ink">Referencia personal</p>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Nombre completo</span>
          <input
            name="personalReferenceName"
            defaultValue={client?.personalReferenceName ?? ""}
            className={inputClass}
            placeholder="Nombre completo"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Telefono</span>
          <input
            name="personalReferencePhone"
            defaultValue={client?.personalReferencePhone ?? ""}
            inputMode="tel"
            className={inputClass}
            placeholder="Telefono"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Direccion</span>
          <input
            name="personalReferenceAddress"
            defaultValue={client?.personalReferenceAddress ?? ""}
            className={inputClass}
            placeholder="Direccion"
          />
        </label>

      </div>

      <div className="flex justify-end">
        <SubmitButton isEditing={Boolean(client)} />
      </div>
    </form>
  );
}
