import { ClientStatus } from "@prisma/client";
import { MapPin, Plus, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge, statusLabels } from "@/components/clients/status-badge";
import { getClients, getZones } from "@/lib/clients";

type ClientsPageProps = {
  searchParams: {
    q?: string;
    zone?: string;
    status?: ClientStatus | "all";
    limit?: string;
  };
};

const statuses: Array<ClientStatus | "all"> = ["all", "active", "delinquent", "settled", "inactive"];

const PAGE_SIZE = 30;

export const dynamic = "force-dynamic";

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const limit = Math.min(Math.max(Number(searchParams.limit) || PAGE_SIZE, PAGE_SIZE), 500);
  const [zones, fetchedClients] = await Promise.all([
    getZones(),
    getClients({
      query: searchParams.q,
      zoneId: searchParams.zone,
      status: searchParams.status ?? "all",
      limit,
    }),
  ]);
  const hasMore = fetchedClients.length > limit;
  const clients = hasMore ? fetchedClients.slice(0, limit) : fetchedClients;
  const moreParams = new URLSearchParams();
  if (searchParams.q) moreParams.set("q", searchParams.q);
  if (searchParams.zone) moreParams.set("zone", searchParams.zone);
  if (searchParams.status) moreParams.set("status", searchParams.status);
  moreParams.set("limit", String(limit + PAGE_SIZE));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Crediflex</p>
          <h1 className="mt-1 text-3xl font-black tracking-normal text-ink sm:text-4xl">Clientes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-700">
            Cartera de clientes por zona, estado y datos de contacto para la ruta de cobro.
          </p>
          <Link href="/creditos" className="mt-2 inline-flex text-sm font-semibold text-moss">
            Ver creditos
          </Link>
        </div>
        <ButtonLink href="/clientes/nuevo" className="w-full sm:w-auto">
          <Plus size={18} aria-hidden />
          Nuevo cliente
        </ButtonLink>
      </header>

      <section className="mb-5 rounded-md border border-line bg-white/70 p-3 shadow-lift backdrop-blur">
        <form className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]" action="/clientes">
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
              placeholder="Buscar por nombre"
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
            name="status"
            defaultValue={searchParams.status ?? "all"}
            className="min-h-12 rounded-md border border-line bg-white px-3 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "Todos los estados" : statusLabels[status]}
              </option>
            ))}
          </select>

          <button className="min-h-12 rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-moss">
            Filtrar
          </button>
        </form>
      </section>

      <section className="grid gap-3">
        {clients.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-white/60 px-5 py-10 text-center">
            <UserRound className="mx-auto text-moss" size={34} aria-hidden />
            <h2 className="mt-3 text-lg font-bold text-ink">Sin clientes encontrados</h2>
            <p className="mt-1 text-sm text-stone-600">Crea el primer cliente o ajusta los filtros.</p>
          </div>
        ) : (
          clients.map((client) => (
            <Link
              key={client.id}
              href={`/clientes/${client.id}`}
              className="rounded-md border border-line bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-moss hover:shadow-lift"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-extrabold text-ink">{client.fullName}</h2>
                    <StatusBadge status={client.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={16} aria-hidden />
                      {client.zone.name}
                    </span>
                    <span>{client.phone || "Sin telefono"}</span>
                    <span>{client._count.credits} creditos</span>
                  </div>
                </div>
                <p className="line-clamp-2 text-sm leading-6 text-stone-700 sm:max-w-sm">{client.address}</p>
              </div>
            </Link>
          ))
        )}
        {hasMore ? (
          <Link
            href={`/clientes?${moreParams.toString()}`}
            className="mt-1 inline-flex min-h-12 items-center justify-center rounded-md border border-line bg-white px-5 text-sm font-extrabold text-moss shadow-soft transition hover:bg-field"
          >
            Mostrar mas clientes
          </Link>
        ) : null}
      </section>
    </main>
  );
}
