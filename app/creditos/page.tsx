import { CreditStatus, CreditType } from "@prisma/client";
import { CircleDollarSign, MapPin, Plus, Search } from "lucide-react";
import Link from "next/link";
import { CreditStatusBadge, creditStatusLabels } from "@/components/credits/credit-status-badge";
import { ButtonLink } from "@/components/ui/button";
import { getCredits } from "@/lib/credits";
import { getZones } from "@/lib/clients";
import { formatCurrency } from "@/lib/money";

type CreditsPageProps = {
  searchParams: {
    q?: string;
    zone?: string;
    type?: CreditType | "all";
    status?: CreditStatus | "all" | "open";
  };
};

const creditTypes: Array<CreditType | "all"> = ["all", "daily", "weekly"];
const creditStatuses: Array<CreditStatus | "all" | "open"> = ["open", "active", "delinquent", "settled", "cancelled", "all"];

const typeLabels: Record<CreditType, string> = {
  daily: "Diario",
  weekly: "Semanal",
};

export const dynamic = "force-dynamic";

export default async function CreditsPage({ searchParams }: CreditsPageProps) {
  const [zones, credits] = await Promise.all([
    getZones(),
    getCredits({
      query: searchParams.q,
      zoneId: searchParams.zone,
      type: searchParams.type ?? "all",
      status: searchParams.status ?? "open",
    }),
  ]);
  const expressCount = credits.filter((credit) => credit.productType === "express").length;
  const standardCount = credits.length - expressCount;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-moss">Crediflex</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-normal text-ink sm:text-4xl">Creditos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-700">
            Consulta prestamos, saldos y pagos pendientes.
          </p>
          <p className="mt-2 text-sm font-semibold text-stone-700">
            {credits.length} credito{credits.length === 1 ? "" : "s"}: {standardCount} normal{standardCount === 1 ? "" : "es"} y {expressCount} express.
          </p>
          <Link href="/clientes" className="mt-2 inline-flex text-sm font-semibold text-moss">
            Ver clientes
          </Link>
        </div>
        <ButtonLink href="/creditos/nuevo" className="w-full sm:w-auto">
          <Plus size={18} aria-hidden />
          Nuevo credito
        </ButtonLink>
      </header>

      <section className="mb-5 rounded-md border border-line bg-white p-3 shadow-soft">
        <form className="grid gap-3 md:grid-cols-[1fr_160px_150px_160px_auto]" action="/creditos">
          <label className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"
              aria-hidden
            />
            <input
              name="q"
              defaultValue={searchParams.q ?? ""}
              className="min-h-12 w-full rounded-md border border-line bg-white px-10 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
              placeholder="Buscar cliente"
            />
          </label>

          <select
            name="zone"
            defaultValue={searchParams.zone ?? "all"}
            className="min-h-12 rounded-md border border-line bg-white px-3 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
          >
            <option value="all">Todas las zonas</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>

          <select
            name="type"
            defaultValue={searchParams.type ?? "all"}
            className="min-h-12 rounded-md border border-line bg-white px-3 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
          >
            {creditTypes.map((type) => (
              <option key={type} value={type}>
                {type === "all" ? "Todos los tipos" : typeLabels[type]}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={searchParams.status ?? "open"}
            className="min-h-12 rounded-md border border-line bg-white px-3 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
          >
            {creditStatuses.map((status) => (
              <option key={status} value={status}>
                {status === "open" ? "Activos" : status === "all" ? "Todos" : creditStatusLabels[status]}
              </option>
            ))}
          </select>

          <button className="min-h-12 rounded-md bg-ink px-5 text-sm font-bold text-white shadow-soft transition hover:bg-moss focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/30">
            Filtrar
          </button>
        </form>
      </section>

      <section className="grid gap-3">
        {credits.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-white/60 px-5 py-10 text-center">
            <CircleDollarSign className="mx-auto text-moss" size={34} aria-hidden />
            <h2 className="mt-3 text-lg font-bold text-ink">Sin creditos encontrados</h2>
            <p className="mt-1 text-sm text-stone-600">Abre un credito nuevo o ajusta los filtros.</p>
          </div>
        ) : (
          credits.map((credit, index) => {
            const paidInstallments = credit.installments.filter((item) => item.status === "paid").length;

            return (
              <Link
                key={credit.id}
                href={`/creditos/${credit.id}`}
                className="rounded-md border border-line bg-white p-4 shadow-soft transition duration-200 hover:border-maize active:scale-[0.995] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/25"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-extrabold text-white">
                        #{credit.creditNumber ?? index + 1}
                      </span>
                      <h2 className="truncate text-lg font-extrabold text-ink">{credit.client.fullName}</h2>
                      <CreditStatusBadge status={credit.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-700">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={16} aria-hidden />
                        {credit.zone.name}
                      </span>
                      <span>{typeLabels[credit.type]}</span>
                      {credit.productType === "express" ? (
                        <span className="rounded-full bg-maize/20 px-2 py-0.5 text-xs font-black text-moss">
                          Express
                        </span>
                      ) : (
                        <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-black text-ink">
                          Normal
                        </span>
                      )}
                      <span>
                        {paidInstallments}/{credit.installmentCount} pagos
                      </span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm text-stone-600">Total a pagar</p>
                    <p className="text-xl font-extrabold text-ink">{formatCurrency(credit.totalAmount)}</p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}
