import { ClientForm } from "@/components/clients/client-form";
import { AppBar } from "@/components/mobile/app-bar";
import { AvatarHero } from "@/components/mobile/avatar-hero";
import { getZones } from "@/lib/clients";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const zones = await getZones();

  return (
    <main className="min-h-screen bg-field">
      <AppBar title="Nuevo Cliente" backHref="/clientes" />
      <AvatarHero />
      <section className="mx-auto max-w-3xl bg-field p-4 sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Alta de cliente</p>
        </div>
        <ClientForm zones={zones} />
      </section>
    </main>
  );
}
