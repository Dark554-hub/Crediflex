import { MapPin, Settings } from "lucide-react";
import { toggleZoneAction } from "@/app/configuracion/actions";
import { AppBar } from "@/components/mobile/app-bar";
import { SettingsForms } from "@/components/settings/settings-forms";
import { getSettingsData } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { creditSettings, profile, zones } = await getSettingsData();

  return (
    <main className="min-h-screen bg-field pb-8">
      <AppBar title="Configuracion" />

      <section className="mx-auto max-w-3xl px-4 py-5">
        <div className="rounded-md bg-ink p-4 text-white shadow-lift">
          <Settings size={34} className="text-maize" aria-hidden />
          <h1 className="mt-3 text-2xl font-black">Administracion del sistema</h1>
          <p className="mt-2 text-sm leading-6 text-white/75">
            Ajusta tasas, mora, operador y zonas sin tocar la base de datos.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4">
        <SettingsForms
          creditSettings={{
            id: creditSettings.id,
            defaultDailyInterestRate: creditSettings.defaultDailyInterestRate.toString(),
            defaultWeeklyInterestRate: creditSettings.defaultWeeklyInterestRate.toString(),
            defaultLateFeeAmount: creditSettings.defaultLateFeeAmount.toString(),
            defaultLateFeeRate: creditSettings.defaultLateFeeRate.toString(),
            lateFeeGraceDays: creditSettings.lateFeeGraceDays,
          }}
          profile={{
            id: profile.id,
            fullName: profile.fullName,
            phone: profile.phone,
            mainZoneId: profile.mainZoneId,
          }}
          zones={zones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            description: zone.description,
            isActive: zone.isActive,
          }))}
        />
      </section>

      <section className="mx-auto mt-4 max-w-3xl px-4">
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-ink">Zonas</h2>
          <div className="mt-4 grid gap-3">
            {zones.map((zone) => (
              <div key={zone.id} className="rounded-md bg-field p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-lg font-black text-ink">
                      <MapPin size={18} aria-hidden />
                      {zone.name}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">{zone.description || "Sin descripcion"}</p>
                  </div>
                  <form action={toggleZoneAction}>
                    <input type="hidden" name="id" value={zone.id} />
                    <input type="hidden" name="isActive" value={String(zone.isActive)} />
                    <button
                      className={`min-h-10 rounded-md px-3 text-sm font-black ${
                        zone.isActive
                          ? "bg-moss text-white"
                          : "border border-line bg-white text-stone-600"
                      }`}
                    >
                      {zone.isActive ? "Activa" : "Inactiva"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
