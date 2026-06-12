"use client";

import { Save } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createZoneAction,
  updateCreditSettingsAction,
  updateProfileAction,
} from "@/app/configuracion/actions";
import { Button } from "@/components/ui/button";

type SettingsFormsProps = {
  creditSettings: {
    id: string;
    defaultDailyInterestRate: string;
    defaultWeeklyInterestRate: string;
    defaultLateFeeAmount: string;
    defaultLateFeeRate: string;
    lateFeeGraceDays: number;
  };
  profile: {
    id: string;
    fullName: string;
    phone: string | null;
    mainZoneId: string | null;
  };
  zones: Array<{
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
  }>;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      <Save size={17} aria-hidden />
      {pending ? "Guardando..." : label}
    </Button>
  );
}

function FormMessage({ state }: { state: { error?: string; success?: string } }) {
  if (!state.error && !state.success) return null;

  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm font-semibold ${
        state.error
          ? "border-clay/30 bg-clay/10 text-clay"
          : "border-moss/30 bg-moss/10 text-moss"
      }`}
    >
      {state.error ?? state.success}
    </div>
  );
}

function rateToPercent(value: unknown) {
  return (Number(value) * 100).toString();
}

export function SettingsForms({ creditSettings, profile, zones }: SettingsFormsProps) {
  const [creditState, creditAction] = useFormState(updateCreditSettingsAction, {});
  const [profileState, profileAction] = useFormState(updateProfileAction, {});
  const [zoneState, zoneAction] = useFormState(createZoneAction, {});

  return (
    <div className="grid gap-4">
      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-ink">Tasas y mora</h2>
        <form action={creditAction} className="mt-4 grid gap-4">
          <input type="hidden" name="id" value={creditSettings.id} />
          <FormMessage state={creditState} />
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Tasa diaria por defecto (%)</span>
            <input
              name="defaultDailyInterestRate"
              defaultValue={rateToPercent(creditSettings.defaultDailyInterestRate)}
              inputMode="decimal"
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none focus:border-moss"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Tasa semanal por defecto (%)</span>
            <input
              name="defaultWeeklyInterestRate"
              defaultValue={rateToPercent(creditSettings.defaultWeeklyInterestRate)}
              inputMode="decimal"
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none focus:border-moss"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Cargo fijo por mora</span>
            <input
              name="defaultLateFeeAmount"
              defaultValue={creditSettings.defaultLateFeeAmount.toString()}
              inputMode="decimal"
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none focus:border-moss"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Tasa de mora (%)</span>
            <input
              name="defaultLateFeeRate"
              defaultValue={rateToPercent(creditSettings.defaultLateFeeRate)}
              inputMode="decimal"
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none focus:border-moss"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Dias de gracia</span>
            <input
              name="lateFeeGraceDays"
              defaultValue={creditSettings.lateFeeGraceDays}
              inputMode="numeric"
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none focus:border-moss"
            />
          </label>
          <SubmitButton label="Guardar tasas" />
        </form>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-ink">Operador</h2>
        <form action={profileAction} className="mt-4 grid gap-4">
          <input type="hidden" name="id" value={profile.id} />
          <FormMessage state={profileState} />
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Nombre</span>
            <input
              name="fullName"
              defaultValue={profile.fullName}
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none focus:border-moss"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Telefono</span>
            <input
              name="phone"
              defaultValue={profile.phone ?? ""}
              inputMode="tel"
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none focus:border-moss"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Zona principal</span>
            <select
              name="mainZoneId"
              defaultValue={profile.mainZoneId ?? ""}
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none focus:border-moss"
            >
              <option value="">Sin zona principal</option>
              {zones
                .filter((zone) => zone.isActive)
                .map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
            </select>
          </label>
          <SubmitButton label="Guardar operador" />
        </form>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black text-ink">Nueva zona</h2>
        <form action={zoneAction} className="mt-4 grid gap-4">
          <FormMessage state={zoneState} />
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Nombre</span>
            <input
              name="name"
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none focus:border-moss"
              placeholder="Ej. Tixkokob"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Descripcion</span>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded-md border border-line bg-white px-4 py-3 text-base outline-none focus:border-moss"
              placeholder="Ruta o notas de cobranza"
            />
          </label>
          <SubmitButton label="Crear zona" />
        </form>
      </section>
    </div>
  );
}
