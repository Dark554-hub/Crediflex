import { CreditForm } from "@/components/credits/credit-form";
import { AppBar } from "@/components/mobile/app-bar";
import { getCreditFormData } from "@/lib/credits";

export const dynamic = "force-dynamic";

export default async function NewCreditPage({
  searchParams,
}: {
  searchParams: { renovar?: string };
}) {
  const { clients, zones, renewalCredit } = await getCreditFormData(searchParams.renovar);

  return (
    <main className="min-h-screen bg-field">
      <AppBar title="Nuevo Prestamo" backHref="/creditos" />
      <section className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">
            {renewalCredit ? "Renovacion" : "Apertura"}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            Captura el monto, los pagos y la fecha de inicio.
          </p>
        </div>
        <CreditForm clients={clients} zones={zones} renewalCredit={renewalCredit} />
      </section>
    </main>
  );
}
